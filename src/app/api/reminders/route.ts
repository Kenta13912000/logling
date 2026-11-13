/**
 * Called every 30 minutes by Vercel Schedules (ADR-0007) to send the
 * reminders that are due.
 */
export async function POST(request: Request): Promise<Response> {
  // Bolt-5 ⑥: placeholder until ⑦ fills it in.
  void request;
  return new Response(null, { status: 500 });
}
