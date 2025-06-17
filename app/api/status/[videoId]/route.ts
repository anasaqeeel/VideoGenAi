import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params;
    console.log(`GET /api/status/${videoId} called`);

    const HEYGEN_KEY = process.env.HEYGEN_KEY;
    if (!HEYGEN_KEY) {
      console.error("❌ HEYGEN_KEY is not set in environment variables");
      return NextResponse.json(
        { error: { message: "HeyGen API key not configured" } },
        { status: 500 }
      );
    }

    const heygenRes = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      {
        headers: {
          "X-Api-Key": HEYGEN_KEY,
          Accept: "application/json",
        },
      }
    );

    const data = await heygenRes.json();
    console.log(
      `HEYGEN /status/${videoId} response:`,
      JSON.stringify(data, null, 2)
    );

    if (!heygenRes.ok) {
      console.error("HeyGen status API error:", data);
      return NextResponse.json(
        {
          error: data.error || { message: "HeyGen status API request failed" },
        },
        { status: heygenRes.status }
      );
    }

    return NextResponse.json(data, { status: heygenRes.status });
  } catch (error) {
    console.error(`Error in /api/status/:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      { error: { message: `Server error: ${errorMessage}` } },
      { status: 500 }
    );
  }
}
