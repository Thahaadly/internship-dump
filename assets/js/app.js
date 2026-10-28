// Galeri polaroid: CRUD, upload, reaksi, lightbox, toast
import {
  db,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "./firebase.js";

const REACTIONS = [
  { type: "love", emoji: "❤️", label: "Suka" },
  { type: "haha", emoji: "😂", label: "Haha" },
  { type: "fire", emoji: "🔥", label: "Keren" },
  { type: "like", emoji: "👍", label: "Like" },
  { type: "adore", emoji: "😍", label: "Kagum" },
  { type: "clap", emoji: "🙌", label: "Semangat" }
];

document.addEventListener("DOMContentLoaded", () => {
  const galleryGrid = document.getElementById("galleryGrid");
  const filterButtons = document.querySelectorAll(".filter-btn");
  const toastContainer = document.getElementById("toastContainer");

  const currentUserNameDisplay = document.getElementById("currentUserNameDisplay");
  const changeNameBtn = document.getElementById("changeNameBtn");
  const nameModal = document.getElementById("nameModal");
  const nameForm = document.getElementById("nameForm");
  const nameInput = document.getElementById("nameInput");
  const uploaderPreviewName = document.getElementById("uploaderPreviewName");

  const photoModal = document.getElementById("photoModal");
  const modalContent = document.getElementById("modalContent");
  const modalImageWrap = document.getElementById("modalImageWrap");
  const modalImg = document.getElementById("modalImg");
  const modalTitle = document.getElementById("modalTitle");
  const modalDate = document.getElementById("modalDate");
  const modalCaption = document.getElementById("modalCaption");
  const modalCategory = document.getElementById("modalCategory");
  const modalUploaderBadge = document.getElementById("modalUploaderBadge");
  const modalReactions = document.getElementById("modalReactions");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const prevPhotoBtn = document.getElementById("prevPhotoBtn");
  const nextPhotoBtn = document.getElementById("nextPhotoBtn");
  const modalEditBtn = document.getElementById("modalEditBtn");
  const modalDeleteBtn = document.getElementById("modalDeleteBtn");
  const commentsList = document.getElementById("commentsList");
  const commentCountBadge = document.getElementById("commentCountBadge");
  const commentForm = document.getElementById("commentForm");
  const commentTextInput = document.getElementById("commentTextInput");
  const submitCommentBtn = document.getElementById("submitCommentBtn");

  const openUploadBtn = document.getElementById("openUploadBtn");
  const uploadModal = document.getElementById("uploadModal");
  const uploadModalContent = document.getElementById("uploadModalContent");
  const closeUploadBtn = document.getElementById("closeUploadBtn");
  const uploadForm = document.getElementById("uploadForm");
  const submitUploadBtn = document.getElementById("submitUploadBtn");
  const submitBtnText = document.getElementById("submitBtnText");
  const uploadProgressContainer = document.getElementById("uploadProgressContainer");
  const uploadProgressBar = document.getElementById("uploadProgressBar");
  const uploadPercentage = document.getElementById("uploadPercentage");
  const uploadStatusText = document.getElementById("uploadStatusText");
  const modalFormHeading = document.getElementById("modalFormHeading");
  const editDocIdInput = document.getElementById("editDocId");
  const editPhotoNote = document.getElementById("editPhotoNote");
  const photoFileLabel = document.getElementById("photoFileLabel");
  const photoFileInput = document.getElementById("photoFileInput");
  const photoCameraInput = document.getElementById("photoCameraInput");
  const photoDropzone = document.getElementById("photoDropzone");
  const pickGalleryBtn = document.getElementById("pickGalleryBtn");
  const pickCameraBtn = document.getElementById("pickCameraBtn");
  const uploadPreview = document.getElementById("uploadPreview");
  const uploadPreviewWrap = document.getElementById("uploadPreviewWrap");
  const dropzoneHint = document.getElementById("dropzoneHint");
  const photoTitleInput = document.getElementById("photoTitleInput");
  const photoDateInput = document.getElementById("photoDateInput");
  const photoCategoryInput = document.getElementById("photoCategoryInput");
  const photoCaptionInput = document.getElementById("photoCaptionInput");

  const tilts = ["-rotate-1", "rotate-1", "-rotate-2", "rotate-2", "rotate-0"];
  let allPhotos = [];
  let currentFilter = "all";
  let activeSelectedPhoto = null;
  let selectedFile = null;
  let previewObjectUrl = null;
  let touchStartX = 0;
  let editingCommentId = null;
  let editingCommentText = "";

  function showToast(message, type = "info") {
    if (!toastContainer) return;
    const el = document.createElement("div");
    const tones = {
      success: "bg-emerald-700 text-white",
      error: "bg-red-700 text-white",
      info: "bg-stone-900 text-white"
    };
    el.className = `pointer-events-auto px-4 py-2.5 rounded-xl text-sm font-semibold text-center ${tones[type] || tones.info}`;
    el.textContent = message;
    toastContainer.appendChild(el);
    setTimeout(() => el.remove(), 3400);
  }

  function getUserName() {
    return localStorage.getItem("internship_user_name") || "";
  }

  function setUserName(name) {
    localStorage.setItem("internship_user_name", name);
    currentUserNameDisplay.textContent = name;
    uploaderPreviewName.textContent = name;
  }

  function requireUserName() {
    const name = getUserName();
    if (name) return name;
    nameModal.classList.remove("hidden");
    showToast("Isi nama dulu ya, biar kelihatan siapa yang upload.", "info");
    return "";
  }

  function todayISO() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
  }

  function toDateInputValue(value) {
    if (!value) return todayISO();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const months = {
      jan: 0, januari: 0, feb: 1, februari: 1, mar: 2, maret: 2,
      apr: 3, april: 3, mei: 4, jun: 5, juni: 5, jul: 6, juli: 6,
      agu: 7, agustus: 7, agt: 7, sep: 8, sept: 8, september: 8,
      okt: 9, oktober: 9, nov: 10, november: 10, des: 11, desember: 11
    };
    const match = String(value).toLowerCase().match(/(\d{1,2})\s*([a-z]+)\s*(\d{4})/);
    if (match) {
      const monthKey = Object.keys(months).find((key) => match[2].startsWith(key) || key.startsWith(match[2]));
      if (monthKey != null) {
        const parsed = new Date(Number(match[3]), months[monthKey], Number(match[1]));
        if (!Number.isNaN(parsed.getTime())) {
          const month = String(parsed.getMonth() + 1).padStart(2, "0");
          const day = String(parsed.getDate()).padStart(2, "0");
          return `${parsed.getFullYear()}-${month}-${day}`;
        }
      }
    }
    return todayISO();
  }

  function formatDisplayDate(value) {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }
    return value;
  }

  function escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getVisiblePhotos() {
    if (currentFilter === "all") return allPhotos;
    return allPhotos.filter((item) => item.category === currentFilter);
  }

  function reactionCounts(photo) {
    const list = photo.reactions || [];
    const counts = {};
    REACTIONS.forEach((reaction) => {
      counts[reaction.type] = 0;
    });
    list.forEach((item) => {
      if (item && counts[item.type] != null) counts[item.type] += 1;
    });
    return counts;
  }

  function myReaction(photo, name) {
    return (photo.reactions || []).find((item) => item.author === name) || null;
  }

  function reactionButtonsHtml(photo, compact) {
    const name = getUserName();
    const mine = myReaction(photo, name);
    const counts = reactionCounts(photo);
    return REACTIONS.map((item) => {
      const active = mine && mine.type === item.type;
      const count = counts[item.type] || 0;
      const base = compact
        ? "reaction-btn inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px]"
        : "reaction-btn inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold";
      const tone = active
        ? "bg-amber-100 text-amber-900"
        : compact
          ? "bg-stone-50 text-stone-500 hover:bg-stone-100"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200";
      return `<button type="button" data-reaction="${item.type}" class="${base} ${tone}" title="${item.label}">${item.emoji} ${count}</button>`;
    }).join("");
  }

  async function toggleReaction(photo, type) {
    const name = requireUserName();
    if (!name || !photo?.id) return;

    const existing = myReaction(photo, name);
    const photoRef = doc(db, "internship_photos", photo.id);

    try {
      if (existing) {
        await updateDoc(photoRef, { reactions: arrayRemove(existing) });
        if (existing.type === type) return;
      }
      await updateDoc(photoRef, { reactions: arrayUnion({ type, author: name }) });
    } catch (err) {
      console.error("Gagal reaksi:", err);
      showToast("Gagal menyimpan reaksi.", "error");
    }
  }

  function bindReactionClicks(root, photo) {
    root.querySelectorAll("[data-reaction]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleReaction(photo, btn.getAttribute("data-reaction"));
      });
    });
  }

  const savedName = getUserName();
  if (!savedName) {
    nameModal.classList.remove("hidden");
  } else {
    currentUserNameDisplay.textContent = savedName;
    uploaderPreviewName.textContent = savedName;
  }

  nameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const entered = nameInput.value.trim();
    if (entered) {
      setUserName(entered);
      nameModal.classList.add("hidden");
    }
  });

  changeNameBtn.addEventListener("click", () => {
    nameInput.value = getUserName();
    nameModal.classList.remove("hidden");
    nameInput.focus();
  });

  function renderGallery(items) {
    galleryGrid.innerHTML = "";

    if (items.length === 0) {
      galleryGrid.innerHTML = `
        <div class="col-span-full py-16 text-center text-blue-200">
          <p class="text-xl mb-2">Belum ada foto di sini 🍃</p>
          <p class="text-sm opacity-80">Jadilah yang pertama mengabadikan momen dengan tombol di atas!</p>
        </div>
      `;
      return;
    }

    items.forEach((item, index) => {
      const tiltClass = tilts[index % tilts.length];
      const card = document.createElement("div");
      card.className = `polaroid-card group relative bg-white p-4 pb-4 rounded-sm cursor-pointer border border-stone-200 ${tiltClass}`;
      card.style.animationDelay = `${index * 90}ms`;

      const rawCaption = item.caption || "";
      const truncatedCaption = rawCaption.length > 65
        ? rawCaption.substring(0, 65).trim() + "..."
        : rawCaption;
      const commentCount = (item.comments && item.comments.length) || 0;
      const uploader = item.uploader || "Teman Magang";
      const imageSrc = escapeHtml(item.image || "");

      card.innerHTML = `
        <div class="tape"></div>
        <div class="overflow-hidden rounded-xs bg-stone-100 aspect-4/3 mb-3">
          <img
            src="${imageSrc}"
            alt="${escapeHtml(item.title)}"
            loading="lazy"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div class="px-1 text-center">
          <h3 class="font-bold text-gray-900 text-base leading-snug mb-0.5 truncate">${escapeHtml(item.title)}</h3>
          <p class="font-handwriting text-amber-700 text-lg">${escapeHtml(formatDisplayDate(item.date))}</p>
          <p class="text-stone-500 text-xs italic leading-relaxed line-clamp-2 px-1 border-t border-stone-100 pt-2 my-2">
            "${escapeHtml(truncatedCaption)}"
          </p>
          <div class="reaction-row flex items-center justify-center gap-1 mb-2">
            ${reactionButtonsHtml(item, true)}
          </div>
          <div class="flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-100 pt-1.5 mt-1">
            <span class="truncate max-w-[130px] text-left">📸 ${escapeHtml(uploader)}</span>
            <span class="inline-flex items-center gap-0.5 text-stone-500 font-medium">💬 ${commentCount}</span>
          </div>
        </div>
      `;

      bindReactionClicks(card, item);
      card.addEventListener("click", () => openDetailModal(item));
      galleryGrid.appendChild(card);
    });
  }

  const photosQuery = query(collection(db, "internship_photos"), orderBy("createdAt", "desc"));

  onSnapshot(photosQuery, (snapshot) => {
    allPhotos = [];
    snapshot.forEach((docSnap) => {
      allPhotos.push({ id: docSnap.id, ...docSnap.data() });
    });

    applyFilter();

    if (activeSelectedPhoto) {
      const updated = allPhotos.find((photo) => photo.id === activeSelectedPhoto.id);
      if (updated) {
        fillDetailModal(updated);
      }
    }
  }, (error) => {
    console.error("Firestore error:", error);
    showToast("Gagal memuat album. Coba refresh.", "error");
  });

  function applyFilter() {
    renderGallery(getVisiblePhotos());
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((item) => {
        item.classList.remove("bg-white", "text-[#00529C]", "font-semibold", "shadow-md");
        item.classList.add("bg-white/15", "text-white", "font-medium", "shadow-sm", "hover:bg-white/25", "border", "border-white/20");
      });
      btn.classList.remove("bg-white/15", "text-white", "font-medium", "shadow-sm", "hover:bg-white/25", "border", "border-white/20");
      btn.classList.add("bg-white", "text-[#00529C]", "font-semibold", "shadow-md");
      currentFilter = btn.getAttribute("data-filter");
      applyFilter();
    });
  });

  function fillDetailModal(item) {
    activeSelectedPhoto = item;
    editingCommentId = null;
    commentTextInput.value = "";
    modalImg.src = item.image || "";
    modalImg.alt = item.title || "";
    modalTitle.textContent = item.title || "";
    modalDate.textContent = formatDisplayDate(item.date);
    modalCaption.textContent = item.caption || "";
    modalCategory.textContent = "#" + (item.category || "magang");
    modalUploaderBadge.textContent = "📸 Oleh: " + (item.uploader || "Teman Magang");
    modalReactions.innerHTML = reactionButtonsHtml(item, false);
    bindReactionClicks(modalReactions, item);
    renderComments(item.comments || []);
    updateNavButtons();
  }

  function updateNavButtons() {
    const visible = getVisiblePhotos();
    const showNav = visible.length > 1;
    prevPhotoBtn.classList.toggle("hidden", !showNav);
    nextPhotoBtn.classList.toggle("hidden", !showNav);
  }

  function openDetailModal(item) {
    fillDetailModal(item);
    photoModal.classList.remove("hidden");
    setTimeout(() => {
      modalContent.classList.remove("scale-95", "opacity-0");
      modalContent.classList.add("scale-100", "opacity-100");
    }, 10);
    document.body.style.overflow = "hidden";
  }

  function showAdjacentPhoto(step) {
    const visible = getVisiblePhotos();
    if (!activeSelectedPhoto || visible.length < 2) return;
    const currentIndex = visible.findIndex((photo) => photo.id === activeSelectedPhoto.id);
    if (currentIndex < 0) return;
    const nextIndex = (currentIndex + step + visible.length) % visible.length;
    fillDetailModal(visible[nextIndex]);
  }

  function renderComments(comments) {
    commentCountBadge.textContent = comments.length;
    commentsList.innerHTML = "";

    if (comments.length === 0) {
      commentsList.innerHTML = `
        <p class="text-xs text-stone-400 py-3 text-center italic">Belum ada komentar. Jadilah yang pertama berkomentar!</p>
      `;
      return;
    }

    comments.forEach((comment) => {
      const div = document.createElement("div");
      div.className = "bg-stone-50 border border-stone-100 rounded-xl p-2.5 text-xs";
      div.dataset.commentId = comment.id || "";
      div.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <strong class="text-stone-800 font-bold">${escapeHtml(comment.author)}</strong>
          <span class="text-[10px] text-stone-400">${escapeHtml(comment.time || "")}</span>
        </div>
        ${
          comment.id === editingCommentId
            ? `<div class="flex items-center gap-2 mt-1">
                 <input id="editCommentInput" type="text" class="flex-1 px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00529C] text-stone-900" value="${escapeHtml(editingCommentText)}" />
                 <button type="button" class="comment-save-btn px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white bg-[#00529C] hover:bg-[#003d75] transition">Simpan</button>
                 <button type="button" class="comment-cancel-btn px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 transition">Batal</button>
               </div>`
            : `<p class="text-stone-600 leading-normal">${escapeHtml(comment.text)}</p>`
        }
        <div class="flex items-center gap-3 mt-1.5">
          <button type="button" class="comment-edit-btn text-[10px] font-semibold text-stone-500 hover:text-[#00529C] transition">✏️ Edit</button>
          <button type="button" class="comment-delete-btn text-[10px] font-semibold text-red-500 hover:text-red-700 transition">🗑️ Hapus</button>
        </div>
      `;
      commentsList.appendChild(div);
    });

    commentsList.scrollTop = commentsList.scrollHeight;
  }

  commentsList.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".comment-edit-btn");
    const deleteBtn = e.target.closest(".comment-delete-btn");
    const saveBtn = e.target.closest(".comment-save-btn");
    const cancelBtn = e.target.closest(".comment-cancel-btn");

    if (saveBtn) {
      const input = document.getElementById("editCommentInput");
      const newText = input ? input.value.trim() : "";
      if (editingCommentId && newText) {
        const updatedComments = (activeSelectedPhoto.comments || []).map((c) =>
          c.id === editingCommentId ? { ...c, text: newText, updatedAt: Date.now() } : c
        );
        await updateDoc(doc(db, "internship_photos", activeSelectedPhoto.id), { comments: updatedComments });
      }
      editingCommentId = null;
      commentTextInput.value = "";
      return;
    }

    if (cancelBtn) {
      editingCommentId = null;
      commentTextInput.value = "";
      return;
    }

    if (editBtn) {
      const row = e.target.closest("[data-comment-id]");
      const commentId = row ? row.dataset.commentId : null;
      const comment = (activeSelectedPhoto.comments || []).find((c) => c.id === commentId);
      if (!comment) return;
      editingCommentId = comment.id || null;
      editingCommentText = comment.text || "";
      if (comment.id) commentTextInput.value = editingCommentText;
      commentTextInput.focus();
      renderComments(activeSelectedPhoto.comments || []);
      return;
    }

    if (deleteBtn) {
      const row = e.target.closest("[data-comment-id]");
      const commentId = row ? row.dataset.commentId : null;
      if (!activeSelectedPhoto || !commentId) return;
      const updatedComments = (activeSelectedPhoto.comments || []).filter((c) => c.id !== commentId);
      try {
        await updateDoc(doc(db, "internship_photos", activeSelectedPhoto.id), { comments: updatedComments });
      } catch (err) {
        console.error("Gagal hapus komentar:", err);
        showToast("Gagal menghapus komentar.", "error");
      }
    }
  });

  commentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeSelectedPhoto) return;

    const userName = requireUserName();
    if (!userName) return;

    const text = commentTextInput.value.trim();
    if (!text) return;

    try {
      submitCommentBtn.disabled = true;
      submitCommentBtn.textContent = "...";

      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      if (editingCommentId) {
        const updatedComments = (activeSelectedPhoto.comments || []).map((c) =>
          c.id === editingCommentId ? { ...c, text, updatedAt: Date.now() } : c
        );
        await updateDoc(doc(db, "internship_photos", activeSelectedPhoto.id), { comments: updatedComments });
        editingCommentId = null;
        commentTextInput.value = "";
        return;
      }

      const commentId = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      await updateDoc(doc(db, "internship_photos", activeSelectedPhoto.id), {
        comments: arrayUnion({
          id: commentId,
          author: userName,
          text,
          time: timeString,
          createdAt: Date.now()
        })
      });

      commentTextInput.value = "";
    } catch (err) {
      console.error("Gagal kirim komentar:", err);
      showToast("Gagal mengirim komentar.", "error");
    } finally {
      submitCommentBtn.disabled = false;
      submitCommentBtn.innerHTML = "<span>Kirim</span>";
    }
  });

  function closeDetailModal() {
    modalContent.classList.remove("scale-100", "opacity-100");
    modalContent.classList.add("scale-95", "opacity-0");
    setTimeout(() => {
      photoModal.classList.add("hidden");
      document.body.style.overflow = "auto";
      activeSelectedPhoto = null;
    }, 200);
  }

  closeModalBtn.addEventListener("click", closeDetailModal);
  photoModal.addEventListener("click", (e) => {
    if (e.target === photoModal) closeDetailModal();
  });
  prevPhotoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showAdjacentPhoto(-1);
  });
  nextPhotoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showAdjacentPhoto(1);
  });

  modalImageWrap.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  modalImageWrap.addEventListener("touchend", (e) => {
    const diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) < 50) return;
    if (diff < 0) showAdjacentPhoto(1);
    else showAdjacentPhoto(-1);
  }, { passive: true });

  modalDeleteBtn.addEventListener("click", async () => {
    if (!activeSelectedPhoto) return;
    const confirmDelete = confirm(`Yakin hapus foto "${activeSelectedPhoto.title}"?`);
    if (!confirmDelete) return;

    try {
      modalDeleteBtn.disabled = true;
      modalDeleteBtn.textContent = "Menghapus...";
      await deleteDoc(doc(db, "internship_photos", activeSelectedPhoto.id));
      closeDetailModal();
      showToast("Foto dihapus dari album.", "success");
    } catch (err) {
      console.error("Gagal hapus:", err);
      showToast("Gagal menghapus foto.", "error");
    } finally {
      modalDeleteBtn.disabled = false;
      modalDeleteBtn.innerHTML = "🗑️ Hapus";
    }
  });

  modalEditBtn.addEventListener("click", () => {
    if (!activeSelectedPhoto) return;
    const item = activeSelectedPhoto;
    closeDetailModal();

    editDocIdInput.value = item.id;
    photoTitleInput.value = item.title || "";
    photoDateInput.value = toDateInputValue(item.date);
    photoCategoryInput.value = item.category || "kantor";
    photoCaptionInput.value = item.caption || "";
    selectedFile = null;
    showExistingPreview(item.image);

    modalFormHeading.textContent = "Edit Momen Magang ✏️";
    submitBtnText.textContent = "Simpan Perubahan";
    photoFileInput.required = false;
    editPhotoNote.classList.remove("hidden");
    photoFileLabel.textContent = "Ganti Foto (Opsional)";
    dropzoneHint.textContent = "Ganti foto? Tarik atau pilih file baru";

    openUploadModal();
  });

  openUploadBtn.addEventListener("click", () => {
    if (!requireUserName()) return;
    resetUploadForm();
    modalFormHeading.textContent = "Tambah Foto Magang 📸";
    submitBtnText.textContent = "Simpan ke Album Magang";
    photoFileInput.required = false;
    editPhotoNote.classList.add("hidden");
    photoFileLabel.textContent = "Foto *";
    dropzoneHint.textContent = "Tarik foto ke sini, atau klik untuk pilih";
    photoDateInput.value = todayISO();
    openUploadModal();
  });

  function openUploadModal() {
    uploadModal.classList.remove("hidden");
    setTimeout(() => {
      uploadModalContent.classList.remove("scale-95", "opacity-0");
      uploadModalContent.classList.add("scale-100", "opacity-100");
    }, 10);
    document.body.style.overflow = "hidden";
  }

  function closeUploadModal() {
    uploadModalContent.classList.remove("scale-100", "opacity-100");
    uploadModalContent.classList.add("scale-95", "opacity-0");
    setTimeout(() => {
      uploadModal.classList.add("hidden");
      document.body.style.overflow = "auto";
    }, 200);
  }

  closeUploadBtn.addEventListener("click", closeUploadModal);
  uploadModal.addEventListener("click", (e) => {
    if (e.target === uploadModal) closeUploadModal();
  });

  function revokePreviewUrl() {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = null;
    }
  }

  function showExistingPreview(src) {
    revokePreviewUrl();
    if (!src) {
      uploadPreviewWrap.classList.add("hidden");
      uploadPreview.removeAttribute("src");
      return;
    }
    uploadPreview.src = src;
    uploadPreviewWrap.classList.remove("hidden");
  }

  function setSelectedFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Pilih file gambar ya.", "error");
      return;
    }
    selectedFile = file;
    revokePreviewUrl();
    previewObjectUrl = URL.createObjectURL(file);
    uploadPreview.src = previewObjectUrl;
    uploadPreviewWrap.classList.remove("hidden");
    dropzoneHint.textContent = file.name;
  }

  function onFileInputChange(event) {
    const file = event.target.files && event.target.files[0];
    setSelectedFile(file);
  }

  photoFileInput.addEventListener("change", onFileInputChange);
  photoCameraInput.addEventListener("change", onFileInputChange);

  pickGalleryBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    photoFileInput.click();
  });
  pickCameraBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    photoCameraInput.click();
  });
  photoDropzone.addEventListener("click", () => photoFileInput.click());

  ["dragenter", "dragover"].forEach((eventName) => {
    photoDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      photoDropzone.classList.add("dropzone-active");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    photoDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      photoDropzone.classList.remove("dropzone-active");
    });
  });
  photoDropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    setSelectedFile(file);
  });

  // Kompresi gambar lewat canvas, hasilkan File JPEG baru (maxWidth, quality)
  function compressImage(file, maxWidth = 1600, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () => reject(new Error("Format gambar tidak didukung."));
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Gagal mengompres foto."));
                return;
              }
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, "") + ".jpg",
                { type: "image/jpeg" }
              );
              resolve(compressedFile);
            },
            "image/jpeg",
            quality
          );
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Upload foto ke serverless function Vercel (/api/upload) lalu return URL-nya
  async function uploadPhoto(file) {
    const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) {
      throw new Error("Gagal mengunggah foto. Status: " + response.status);
    }
    const data = await response.json();
    return data.url;
  }

  function setProgress(percent, status) {
    uploadProgressContainer.classList.remove("hidden");
    uploadProgressBar.style.width = `${percent}%`;
    uploadPercentage.textContent = `${percent}%`;
    if (status) uploadStatusText.textContent = status;
  }

  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const editId = editDocIdInput.value;
    const userName = getUserName() || "Teman Magang";

    if (!editId && !selectedFile) {
      showToast("Pilih foto dulu ya.", "error");
      return;
    }

    try {
      submitUploadBtn.disabled = true;
      let imageUrl = null;
      let storagePath = null;

      if (selectedFile) {
        setProgress(10, "Mengompresi foto...");
        const file = await compressImage(selectedFile);
        setProgress(20, "Mengunggah ke album...");
        imageUrl = await uploadPhoto(file);
        storagePath = imageUrl ? new URL(imageUrl).pathname.replace(/^\//, "") : null;
      }

      setProgress(95, "Menyimpan data...");

      if (editId) {
        const updateData = {
          title: photoTitleInput.value.trim(),
          date: photoDateInput.value,
          category: photoCategoryInput.value,
          caption: photoCaptionInput.value.trim(),
          updatedAt: serverTimestamp()
        };
        if (imageUrl) {
          updateData.image = imageUrl;
          updateData.storagePath = storagePath;
        }
        await updateDoc(doc(db, "internship_photos", editId), updateData);
      } else {
        await addDoc(collection(db, "internship_photos"), {
          title: photoTitleInput.value.trim(),
          date: photoDateInput.value,
          category: photoCategoryInput.value,
          caption: photoCaptionInput.value.trim(),
          uploader: userName,
          image: imageUrl,
          storagePath,
          comments: [],
          reactions: [],
          createdAt: serverTimestamp()
        });
      }

      setProgress(100, "Selesai!");
      showToast(editId ? "Perubahan tersimpan." : "Foto masuk album!", "success");

      setTimeout(() => {
        resetUploadForm();
        closeUploadModal();
      }, 350);
    } catch (err) {
      console.error("Error submit:", err);
      showToast("Gagal menyimpan foto. " + (err?.message || err?.code || "Unknown error"), "error");
      uploadProgressContainer.classList.add("hidden");
      uploadProgressBar.style.width = "0%";
      uploadPercentage.textContent = "0%";
      submitUploadBtn.disabled = false;
    }
  });

  function resetUploadForm() {
    uploadForm.reset();
    editDocIdInput.value = "";
    selectedFile = null;
    showExistingPreview("");
    photoFileInput.value = "";
    photoCameraInput.value = "";
    uploadProgressContainer.classList.add("hidden");
    uploadProgressBar.style.width = "0%";
    uploadPercentage.textContent = "0%";
    submitUploadBtn.disabled = false;
    submitBtnText.textContent = "Simpan ke Album Magang";
    dropzoneHint.textContent = "Tarik foto ke sini, atau klik untuk pilih";
  }

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    if (e.key === "Escape") {
      if (!photoModal.classList.contains("hidden")) closeDetailModal();
      if (!uploadModal.classList.contains("hidden")) closeUploadModal();
      if (!nameModal.classList.contains("hidden") && getUserName()) nameModal.classList.add("hidden");
    }

    if (photoModal.classList.contains("hidden")) return;
    if (e.key === "ArrowLeft") showAdjacentPhoto(-1);
    if (e.key === "ArrowRight") showAdjacentPhoto(1);
  });
});
