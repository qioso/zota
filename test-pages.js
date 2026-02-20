const pages = ['/', '/report', '/intelligence', '/holders', '/projects', '/tokens', '/events', '/api/holders', '/api/stats'];
Promise.all(pages.map(p =>
    fetch('http://localhost:3000' + p)
        .then(r => ({ page: p, status: r.status }))
        .catch(e => ({ page: p, status: 'ERR:' + e.code }))
)).then(results => {
    results.forEach(r => console.log(r.status === 200 ? 'OK  ' : 'FAIL', r.page, r.status));
});
