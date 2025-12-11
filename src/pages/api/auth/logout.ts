export const prerender = false;

export async function POST() {
	// Client side handles token removal, server just acknowledges
	return new Response(JSON.stringify({ success: true }), { status: 200 });
}
