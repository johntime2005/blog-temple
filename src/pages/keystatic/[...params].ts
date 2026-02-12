export const prerender = false;

export const GET = () => {
	return new Response(
		"<!doctype html><html><body><h1>Debug API Route</h1></body></html>",
		{
			headers: { "Content-Type": "text/html" },
		},
	);
};
