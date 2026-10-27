async function test() {
  const rootRes = await fetch('http://localhost:5000/');
  const rootText = await rootRes.text();

  const homeRes = await fetch('http://localhost:5000/home');
  const homeText = await homeRes.text();

  const indexRes = await fetch('http://localhost:5000/index.html', { redirect: 'manual' });

  console.log({
    root: {
      status: rootRes.status,
      hasHeading: rootText.includes('AEGIS-web app'),
      hasGetStartedBtn: rootText.includes('Get Started'),
      hasHomeLink: rootText.includes('href="/home"')
    },
    home: {
      status: homeRes.status,
      hasDashboard: homeText.includes('dashboard-container'),
      hasLeaflet: homeText.includes('leaflet'),
      hasSignInBtn: homeText.includes('btn-header-login'),
      hasHiddenAuthModal: homeText.includes('id="auth-overlay" style="display: none;"')
    },
    indexRedirect: {
      status: indexRes.status,
      location: indexRes.headers.get('location')
    }
  });
}

test().catch(console.error);
