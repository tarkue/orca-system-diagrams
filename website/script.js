'use strict';

const tabs = [...document.querySelectorAll('[role="tab"]')];

function selectTab(selectedTab) {
  for (const tab of tabs) {
    const selected = tab === selectedTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  }
}

for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    const index = tabs.indexOf(tab);
    const targets = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 };
    if (!Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    const nextTab = tabs[targets[event.key]];
    selectTab(nextTab);
    nextTab.focus();
    nextTab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}

const copyGitButton = document.getElementById('copy-git-url');
copyGitButton.addEventListener('click', async () => {
  const code = document.getElementById('git-install-url');
  const status = document.getElementById('copy-git-status');
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(code.textContent.trim());
    status.textContent = 'Ссылка скопирована. Вставьте её в Orca → Plugins → Install plugin.';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(code);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    status.textContent = 'Ссылка выделена — скопируйте её через Ctrl/Cmd + C.';
  }
});
