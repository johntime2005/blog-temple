export const prerender = false;

export const GET = async ({ request, locals }) => {
    const cookieHeader = request.headers.get('Cookie') || '';
    // Manual parsing
    const match = cookieHeader.match(/keystatic-gh-access-token=([^;]+)/);
    const accessToken = match ? match[1] : null;
    
    const env = locals?.runtime?.env || {};
    const secret = env.SITE_SECRET;

    if (!accessToken) {
        return new Response(JSON.stringify({ error: "No access token found in cookies", cookies: cookieHeader }, null, 2), { 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
    
    // Test GitHub User
    const res = await fetch('https://api.github.com/user', {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'Keystatic-Debug'
        }
    });
    const userData = await res.json();

    // Test GitHub Repo Access
    const repoRes = await fetch('https://api.github.com/repos/johntime2005/blog', {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'Keystatic-Debug'
        }
    });
    const repoData = await repoRes.json();

    return new Response(JSON.stringify({
        github_status: res.status,
        github_user: userData.login || userData.message,
        repo_status: repoRes.status,
        repo_name: repoData.full_name || repoData.message,
        secret_status: secret ? `Present (${secret.length} chars)` : 'Missing'
    }, null, 2), { 
        headers: { 'Content-Type': 'application/json' } 
    });
}
