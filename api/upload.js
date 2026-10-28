// Serverless function (Vercel) untuk upload foto ke Vercel Blob
import { put } from "@vercel/blob";

export default {
  async fetch(request) {
    // Hanya menerima method POST
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const url = new URL(request.url);
      const filename = url.searchParams.get("filename") || `${Date.now()}.jpg`;

      const body = Buffer.from(await request.arrayBuffer());
      const blob = await put(`photos/${filename}`, body, {
        access: "public",
        addRandomSuffix: true,
      });

      return new Response(JSON.stringify(blob), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error?.message || "Upload gagal" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
