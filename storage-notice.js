function showStorageNotice() {
  if (localStorage.getItem('storage_notice_dismissed')) return;

  const banner = document.createElement('div');
  banner.id = 'storage-notice';
  banner.innerHTML =
    'This site uses only technical storage necessary for login. See our ' +
    '<a href="docs/privacy.html">Privacy Policy</a>. ' +
    '<button id="storage-notice-dismiss">Ok, got it</button>';

  document.body.appendChild(banner);

  document.getElementById('storage-notice-dismiss').onclick = function() {
    localStorage.setItem('storage_notice_dismissed', 'true');
    banner.remove();
  };
}

showStorageNotice();
