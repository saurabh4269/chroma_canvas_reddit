import { context, requestExpandedMode } from '@devvit/web/client';

const startButton = document.getElementById('start-button') as HTMLButtonElement;
const titleElement = document.getElementById('title') as HTMLHeadingElement;
const levelInfo = document.getElementById('level-info') as HTMLParagraphElement;

startButton.addEventListener('click', (e) => {
  requestExpandedMode(e, 'game');
});

type SplashPostData = {
  levelSeq?: number;
  date?: string;
  corpseCount?: number;
};

function init() {
  const username = context?.username ?? 'climber';
  titleElement.textContent = `Chroma Canvas`;

  const postData = context?.postData as SplashPostData | undefined;

  if (postData?.levelSeq) {
    levelInfo.textContent = `Level #${postData.levelSeq} · ${postData.corpseCount ?? 0} fallen · ${username}`;
  } else {
    levelInfo.textContent = `${username} — carry the orb, petrify on death`;
  }
}

init();
