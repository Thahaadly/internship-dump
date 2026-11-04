// Galeri polaroid: CRUD, upload, reaksi, lightbox, toast
import { INTERN_MEMBERS } from "./members.js";
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
  serverTimestamp,
  where
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
  const sortSelect = document.getElementById("sortSelect");
  const toastContainer = document.getElementById("toastContainer");

  const currentUserNameDisplay = document.getElementById("currentUserNameDisplay");
  const currentUserAvatar = document.getElementById("currentUserAvatar");
  const changeNameBtn = document.getElementById("changeNameBtn");
  const nameModal = document.getElementById("nameModal");
  const memberSelectGrid = document.getElementById("memberSelectGrid");
  const nameForm = document.getElementById("nameForm");
  const nameInput = document.getElementById("nameInput");
  const uploaderPreviewName = document.getElementById("uploaderPreviewName");

  const membersNavRow = document.getElementById("membersNavRow");
  const visitingBanner = document.getElementById("visitingBanner");
  const visitingAvatar = document.getElementById("visitingAvatar");
  const visitingName = document.getElementById("visitingName");
  const visitingRole = document.getElementById("visitingRole");
  const visitingBio = document.getElementById("visitingBio");
  const clearVisitingBtn = document.getElementById("clearVisitingBtn");

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
  let currentSort = "newest";
  let visitedMember = null; // null jika di feed utama, atau username jika berkunjung ke profil teman
  let activeSelectedPhoto = null;
  let selectedFile = null;
  let previewObjectUrl = null;
  let touchStartX = 0;
  let editingCommentId = null;
  let editingCommentText = "";
  let unsubscribePhotos = () => {};
  let isLoadingPhotos = true;
  let unsubscribeStories = () => {};
  let stories = [];
  let storyViewerOpen = false;
  let storyList = [];
  let storyIndex = 0;
  let storyProgressTimer = null;
  let storyIntent = false;

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

  function getUserAvatar(name) {
    const member = INTERN_MEMBERS.find((m) => m.name.toLowerCase() === (name || "").toLowerCase() || m.username.toLowerCase() === (name || "").toLowerCase());
    return member ? member.avatar : "assets/images/ID_CARD.jpg";
  }

  function setUserName(name) {
    localStorage.setItem("internship_user_name", name);
    if (currentUserNameDisplay) currentUserNameDisplay.textContent = name;
    if (uploaderPreviewName) uploaderPreviewName.textContent = name;
    if (currentUserAvatar) currentUserAvatar.src = getUserAvatar(name);
  }

  function requireUserName() {
    const name = getUserName();
    if (name) return name;
    openProfileModal();
    showToast("Pilih profilmu dulu ya, biar kelihatan siapa yang berkegiatan.", "info");
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

  function getPhotoTime(photo) {
    if (photo.createdAt) {
      if (typeof photo.createdAt.toMillis === "function") {
        return photo.createdAt.toMillis();
      }
      if (photo.createdAt.seconds) {
        return photo.createdAt.seconds * 1000;
      }
      if (typeof photo.createdAt === "number") {
        return photo.createdAt;
      }
    }
    if (photo.date) {
      const parsed = Date.parse(photo.date);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return 0;
  }

  function getVisiblePhotos() {
    let list = [...allPhotos];

    // Filter jika sedang mengunjungi profil teman tertentu
    if (visitedMember) {
      list = list.filter((item) => {
        const uploader = (item.uploader || "").toLowerCase();
        return uploader === visitedMember.name.toLowerCase() || uploader === visitedMember.username.toLowerCase();
      });
    }

    // Filter kategori jika bukan "all"
    if (currentFilter !== "all") {
      list = list.filter((item) => item.category === currentFilter);
    }

    list.sort((a, b) => {
      const timeA = getPhotoTime(a);
      const timeB = getPhotoTime(b);
      return currentSort === "oldest" ? timeA - timeB : timeB - timeA;
    });

    return list;
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

  function openProfileModal() {
    renderMemberSelection();
    nameModal.classList.remove("hidden");
  }

  function renderMemberSelection() {
    if (!memberSelectGrid) return;
    memberSelectGrid.innerHTML = "";
    INTERN_MEMBERS.forEach((m) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "flex flex-col items-center p-3 rounded-2xl border-2 border-stone-200 hover:border-[#00529C] hover:bg-blue-50/50 transition group";
      card.innerHTML = `
        <img src="${m.avatar}" alt="${m.name}" class="w-16 h-16 rounded-full object-cover mb-2 border-2 border-white shadow group-hover:scale-105 transition-transform">
        <span class="font-bold text-sm text-stone-900 group-hover:text-[#00529C]">${m.name}</span>
        <span class="text-[10px] text-stone-500 text-center leading-tight mt-0.5 line-clamp-1">${m.role}</span>
      `;
      card.addEventListener("click", () => {
        setUserName(m.name);
        nameModal.classList.add("hidden");
        showToast(`Selamat datang kembali, ${m.name}! 🎉`, "success");
      });
      memberSelectGrid.appendChild(card);
    });
  }

  function renderMembersNav() {
    if (!membersNavRow) return;
    membersNavRow.innerHTML = "";

    // Tombol "Semua Momen" di nav profil
    const allBtn = document.createElement("button");
    allBtn.className = `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition shadow-sm ${
      !visitedMember ? "bg-amber-400 text-stone-900 ring-2 ring-white" : "bg-white/20 text-white hover:bg-white/30"
    }`;
    allBtn.innerHTML = `<span>🌟</span> Semua Tim`;
    allBtn.addEventListener("click", () => visitMemberProfile(null));
    membersNavRow.appendChild(allBtn);

    INTERN_MEMBERS.forEach((m) => {
      const isSelected = visitedMember && visitedMember.username === m.username;
      const btn = document.createElement("button");
      btn.className = `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition shadow-sm ${
        isSelected ? "bg-amber-400 text-stone-900 ring-2 ring-white scale-105" : "bg-white/20 text-white hover:bg-white/30"
      }`;
      btn.innerHTML = `
        <img src="${m.avatar}" alt="${m.name}" class="w-5 h-5 rounded-full object-cover">
        <span>${m.name}</span>
      `;
      btn.addEventListener("click", () => visitMemberProfile(m));
      membersNavRow.appendChild(btn);
    });
  }

  function visitMemberProfile(member) {
    visitedMember = member;
    renderMembersNav();

    if (member) {
      visitingBanner.classList.remove("hidden");
      visitingAvatar.src = member.avatar;
      visitingName.textContent = `Album ${member.name} 📸`;
      visitingRole.textContent = member.role;
      visitingBio.textContent = `"${member.bio}"`;
      showToast(`Melihat momen dari ${member.name}`, "info");
    } else {
      visitingBanner.classList.add("hidden");
    }

    applyFilter();
  }

  if (clearVisitingBtn) {
    clearVisitingBtn.addEventListener("click", () => visitMemberProfile(null));
  }

  const savedName = getUserName();
  if (!savedName) {
    openProfileModal();
  } else {
    setUserName(savedName);
  }
  renderMembersNav();

  nameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const entered = nameInput.value.trim();
    if (entered) {
      setUserName(entered);
      nameModal.classList.add("hidden");
      showToast(`Selamat datang, ${entered}! 🚀`, "success");
    }
  });

  changeNameBtn.addEventListener("click", () => {
    openProfileModal();
  });

  function renderGallery(items) {
    if (isLoadingPhotos) {
      galleryGrid.innerHTML = `
        <div class="col-span-full py-20 text-center text-blue-200">
          <p class="text-lg animate-pulse">Memuat album kenangan... ⏳</p>
        </div>
      `;
      return;
    }

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
      const uploaderAvatar = getUserAvatar(uploader);
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
          <div class="flex items-center justify-between text-[11px] text-stone-500 border-t border-stone-100 pt-1.5 mt-1">
            <span class="inline-flex items-center gap-1.5 truncate max-w-[140px] text-left font-medium">
              <img src="${uploaderAvatar}" class="w-4 h-4 rounded-full object-cover border border-stone-300">
              ${escapeHtml(uploader)}
            </span>
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

  unsubscribePhotos = onSnapshot(photosQuery, (snapshot) => {
    // Perbarui daftar foto dari perubahan dokumen (added / modified / removed)
    snapshot.docChanges().forEach((change) => {
      const photo = { id: change.doc.id, ...change.doc.data() };
      if (change.type === "added") {
        if (!allPhotos.some((item) => item.id === photo.id)) allPhotos.unshift(photo);
      } else if (change.type === "modified") {
        const index = allPhotos.findIndex((item) => item.id === photo.id);
        if (index !== -1) allPhotos[index] = photo;
      } else if (change.type === "removed") {
        allPhotos = allPhotos.filter((item) => item.id !== change.doc.id);
      }
    });

    isLoadingPhotos = false;

    applyFilter();

    if (activeSelectedPhoto) {
      const updated = allPhotos.find((photo) => photo.id === activeSelectedPhoto.id);
      if (updated) {
        fillDetailModal(updated);
      }
    }
  }, (error) => {
    isLoadingPhotos = false;
    console.error("Firestore error:", error);
    showToast("Gagal memuat album. Coba refresh.", "error");
  });

  const storiesQuery = query(
    collection(db, "stories"),
    where("expiresAt", ">", Date.now()),
    orderBy("expiresAt", "asc")
  );

  unsubscribeStories = onSnapshot(storiesQuery, (snapshot) => {
    stories = [];
    snapshot.forEach((docSnap) => {
      stories.push({ id: docSnap.id, ...docSnap.data() });
    });
    stories.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    renderStories();
  }, (error) => {
    console.error("Stories error:", error);
  });

  function timeAgo(timestamp) {
    const createdAt = Number(timestamp) || 0;
    const diff = Date.now() - createdAt;
    if (diff < 60 * 1000) return "baru saja";
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} menit lalu`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} jam lalu`;
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))} hari lalu`;
  }

  function renderStories() {
    const storiesRow = document.getElementById("storiesRow");
    if (!storiesRow) return;
    storiesRow.innerHTML = "";
    const groups = new Map();
    stories.forEach((story) => {
      const name = story.name || "Teman Magang";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(story);
    });
    const row = document.createElement("div");
    row.className = "flex gap-3 overflow-x-auto";
    groups.forEach((list) => {
      list.forEach((story) => {
        const circle = document.createElement("button");
        circle.type = "button";
        circle.className = "story-circle shrink-0 w-14 h-14 rounded-full overflow-hidden border-2 border-transparent hover:border-amber-400 transition";
        circle.dataset.storyId = story.id;
        const img = document.createElement("img");
        img.src = story.url;
        img.alt = `Story ${story.name || "Teman Magang"}`;
        img.className = "w-full h-full object-cover";
        circle.appendChild(img);
        circle.addEventListener("click", () => openStoryViewer(stories, stories.findIndex((s) => s.id === story.id)));
        row.appendChild(circle);
      });
    });
    storiesRow.appendChild(row);
  }

  function openStoryViewer(list, index) {
    storyList = list;
    storyIndex = index;
    storyViewerOpen = true;
    const img = document.getElementById("storyImg");
    const nameEl = document.getElementById("storyName");
    const progressBar = document.getElementById("storyProgressBar");
    if (img && storyList[storyIndex]) img.src = storyList[storyIndex].url || "";
    if (nameEl) nameEl.textContent = storyList[storyIndex]?.name || "Teman Magang";
    const timeEl = document.getElementById("storyTime");
    if (timeEl) timeEl.textContent = timeAgo(storyList[storyIndex]?.createdAt);
    if (progressBar) progressBar.style.width = "0%";
    const viewer = document.getElementById("storyViewer");
    if (viewer) viewer.classList.remove("hidden");
    startStoryProgress();
  }

  function startStoryProgress() {
    if (storyProgressTimer) clearInterval(storyProgressTimer);
    const progressBar = document.getElementById("storyProgressBar");
    const startedAt = Date.now();
    storyProgressTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const percent = Math.min(100, (elapsed / 5000) * 100);
      if (progressBar) progressBar.style.width = percent + "%";
      if (percent >= 100) {
        clearInterval(storyProgressTimer);
        storyProgressTimer = null;
        nextStory();
      }
    }, 50);
  }

  function nextStory() {
    if (storyIndex + 1 >= storyList.length) {
      closeStoryViewer();
      return;
    }
    storyIndex += 1;
    openStoryViewer(storyList, storyIndex);
  }

  function prevStory() {
    if (storyIndex > 0) {
      storyIndex -= 1;
      openStoryViewer(storyList, storyIndex);
    }
  }

  function closeStoryViewer() {
    storyViewerOpen = false;
    if (storyProgressTimer) {
      clearInterval(storyProgressTimer);
      storyProgressTimer = null;
    }
    const viewer = document.getElementById("storyViewer");
    if (viewer) viewer.classList.add("hidden");
  }

  function createStoryFromFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      showToast("Pilih file gambar ya.", "error");
      return;
    }
    (async () => {
      try {
        const fileJpeg = await compressImage(file);
        const url = await uploadPhoto(fileJpeg);
        const name = getUserName() || "Teman Magang";
        await addDoc(collection(db, "stories"), {
          url,
          name,
          createdAt: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000
        });
        showToast("Story berhasil dikirim!", "success");
      } catch (err) {
        console.error("Gagal membuat story:", err);
        showToast("Gagal membuat story. " + (err?.message || ""), "error");
      }
    })();
  }

  const storyMediaEl = document.getElementById("storyMedia");
  const storyCloseBtn = document.getElementById("storyCloseBtn");
  const storyDeleteBtn = document.getElementById("storyDeleteBtn");

  storyMediaEl?.addEventListener("click", (e) => {
    if (!storyViewerOpen) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width / 2) prevStory();
    else nextStory();
  });

  storyCloseBtn?.addEventListener("click", closeStoryViewer);

  storyDeleteBtn?.addEventListener("click", async () => {
    if (!storyList[storyIndex]) return;
    const current = storyList[storyIndex];
    const ok = confirm(`Yakin hapus story "${current.name}"?`);
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "stories", current.id));
      if (storyIndex + 1 >= storyList.length) closeStoryViewer();
      else {
        storyIndex += 1;
        openStoryViewer(storyList, storyIndex);
      }
    } catch (err) {
      console.error("Gagal hapus story:", err);
      showToast("Gagal menghapus story.", "error");
    }
  });

  document.getElementById("addStoryBtn")?.addEventListener("click", () => {
    storyIntent = true;
    photoFileInput.click();
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

  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      applyFilter();
    });
  }

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
    if (storyIntent) {
      storyIntent = false;
      createStoryFromFile(file);
      return;
    }
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
  document.getElementById("takePhotoBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    storyIntent = true;
    photoCameraInput.click();
  });
  document.getElementById("pickGalleryFromBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    storyIntent = true;
    photoFileInput.click();
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

  // Kompresi gambar lewat canvas, hasilkan File JPEG baru (maxWidth, maxHeight, quality)
  function compressImage(file, maxDimension = 1280, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () => reject(new Error("Format gambar tidak didukung."));
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Batasi resolusi maksimum (baik lebar maupun tinggi) agar hemat storage & bandwidth
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          // Gambar ulang ke canvas dengan image smoothing aktif
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
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
              console.log(
                `[Compress] Dari ${(file.size / 1024).toFixed(1)} KB -> ${(compressedFile.size / 1024).toFixed(1)} KB (${width}x${height})`
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
      const errorData = await response.json().catch(() => null);
      console.error("Upload error:", errorData?.error || "Gagal mengunggah foto.");
      throw new Error(errorData?.error || "Gagal mengunggah foto. Status: " + response.status);
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
      if (uploadPreview && imageUrl) uploadPreview.src = imageUrl;
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
