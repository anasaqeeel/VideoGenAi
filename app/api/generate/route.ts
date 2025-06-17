import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(
      "POST /api/generate called with body:",
      JSON.stringify(body, null, 2)
    );

    const HEYGEN_KEY = process.env.HEYGEN_KEY;
    if (!HEYGEN_KEY) {
      console.error("❌ HEYGEN_KEY is not set in environment variables");
      return NextResponse.json(
        { error: { message: "HeyGen API key not configured" } },
        { status: 500 }
      );
    }

    const heygenRes = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": HEYGEN_KEY,
      },
      body: JSON.stringify(body),
    });

    const text = await heygenRes.text();
    console.log("HEYGEN /generate response:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("Invalid JSON from HeyGen:", text);
      return NextResponse.json(
        { error: { message: "Invalid JSON response from HeyGen" }, raw: text },
        { status: 500 }
      );
    }

    if (!heygenRes.ok) {
      console.error("HeyGen API error:", data);
      return NextResponse.json(
        { error: data.error || { message: "HeyGen API request failed" } },
        { status: heygenRes.status }
      );
    }

    return NextResponse.json(data, { status: heygenRes.status });
  } catch (error) {
    console.error("Error in /api/generate:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      { error: { message: `Server error: ${errorMessage}` } },
      { status: 500 }
    );
  }
}
