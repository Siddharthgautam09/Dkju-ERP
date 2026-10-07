import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { url: imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    // console.log("Proxying image:", imageUrl);

    const response = await fetch(imageUrl);

    if (!response.ok) {
      console.error(
        `Upstream fetch failed: ${response.status} ${response.statusText}`
      );
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get("content-type") || "image/jpeg";
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({ dataUrl });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json(
      { error: `Failed to process image: ${error.message}` },
      { status: 500 }
    );
  }
}
