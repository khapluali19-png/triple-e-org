import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuthorization } from "@/lib/server/adminAuth";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

export async function POST(request: NextRequest) {
  const auth = verifyAdminAuthorization(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.reason || "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No image file provided." },
        { status: 400 }
      );
    }

    // 1. Validate File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: "File exceeds 2 MB limit. Please optimize the image." },
        { status: 400 }
      );
    }

    // 2. Validate MIME Type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Invalid file type. Allowed formats: JPEG, PNG, WEBP, SVG." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. Prevent arbitrary executable uploads: Generate safe randomized filename
    const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : file.type === "image/svg+xml" ? ".svg" : ".jpg";
    const safeFilename = `upload_${Date.now()}_${crypto.randomBytes(8).toString("hex")}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads");

    // Check if local directory is writable (e.g. Node server), or fallback to data URL for serverless/readonly
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, safeFilename);
      fs.writeFileSync(filePath, buffer);

      return NextResponse.json({
        success: true,
        message: "Image uploaded successfully.",
        url: `/uploads/${safeFilename}`,
      });
    } catch {
      // Fallback for read-only serverless filesystems: generate base64 data URL safely
      const base64Data = buffer.toString("base64");
      const dataUrl = `data:${file.type};base64,${base64Data}`;
      return NextResponse.json({
        success: true,
        message: "Image loaded and converted safely for serverless environment.",
        url: dataUrl,
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to process image upload." },
      { status: 500 }
    );
  }
}
