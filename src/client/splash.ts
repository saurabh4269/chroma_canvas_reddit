import { context, requestExpandedMode } from '@devvit/web/client';

const startButton = document.getElementById('start-button') as HTMLButtonElement;
const titleElement = document.getElementById('title') as HTMLHeadingElement;
const levelInfo = document.getElementById('level-info') as HTMLParagraphElement;

startButton.addEventListener('click', (e) => {
  requestExpandedMode(e, 'game');
});

function init() {
  const username = context.username ?? 'climber';
  titleElement.textContent = `Chroma Canvas`;

  const postData = context.postData as
    | { levelSeq?: number; date?: string; corpseCount?: number }
    | undefined;

  if (postData?.levelSeq) {
    levelInfo.textContent = `Level #${postData.levelSeq} · ${postData.corpseCount ?? 0} fallen · Hey ${username}`;
  } else {
    levelInfo.textContent = `Hey ${username} — carry the orb, petrify on death`;
  }
}

init();
