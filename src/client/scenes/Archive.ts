import { Scene } from 'phaser';
import type { GameObjects } from 'phaser';
import type { ArchiveEntry } from '../../shared/level';
import { fetchHistory } from '../net/api';
import { COLORS, FONTS, HEX } from '../theme';
import { addCard, addDisplayTitle, addGameButton, drawSunnyBackdrop } from '../ui/phaserUi';

/**
 * The Archive — a permanent visual history of how the community moved
 * through each day's canvas: every platform, every petrified climber, a dot.
 */
export class Archive extends Scene {
  private rows: GameObjects.Container[] = [];
  private status!: GameObjects.Text;

  constructor() {
    super('Archive');
  }

  create() {
    this.rows = [];
    const { width, height } = this.scale;
    this.cameras.resize(width, height);
    drawSunnyBackdrop(this, width, height);

    addDisplayTitle(this, width / 2, height * 0.09, 'The Archive', 36);
    this.add
      .text(width / 2, height * 0.165, 'How the community moved, day by day', {
        fontFamily: FONTS.body,
        fontSize: '14px',
        fontStyle: '700',
        color: HEX.ink,
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    this.status = this.add
      .text(width / 2, height * 0.45, 'Opening the archive…', {
        fontFamily: FONTS.body,
        fontSize: '15px',
        fontStyle: '700',
        color: HEX.inkSoft,
      })
      .setOrigin(0.5);

    addGameButton(
      this,
      width / 2,
      height - 44,
      'Back',
      'ghost',
      () => this.scene.start('MainMenu'),
      150,
      44
    );

    void this.loadEntries();
  }

  private async loadEntries() {
    try {
      const res = await fetchHistory();
      if (!this.scene.isActive()) return;
      this.status.setVisible(false);
      this.renderEntries(res.entries.slice(0, 8));
    } catch {
      this.status.setText('The archive is still being written.\nCome back after the first rotation.');
    }
  }

  private renderEntries(entries: ArchiveEntry[]) {
    const { width, height } = this.scale;
    if (entries.length === 0) {
      this.status
        .setVisible(true)
        .setText('No completed days yet.\nToday’s fallen will be recorded here.');
      return;
    }

    const rowH = Math.min(88, (height * 0.62) / entries.length);
    const startY = height * 0.24;

    entries.forEach((entry, i) => {
      const y = startY + i * rowH + rowH / 2;
      const row = this.add.container(width / 2, y);
      const cardW = Math.min(width * 0.9, 400);
      const card = addCard(this, 0, 0, cardW, rowH - 10, 14);
      row.add(card);

      // Mini heatmap of the day's canvas
      const mapW = cardW - 32;
      const mapH = rowH - 42;
      const sx = mapW / entry.width;
      const sy = mapH / entry.height;
      const map = this.add.graphics({ x: -mapW / 2, y: -rowH / 2 + 10 });

      map.fillStyle(COLORS.dirt, 1);
      for (const p of entry.platforms) {
        map.fillRect(p.x * sx, p.y * sy, Math.max(2, p.w * sx), 2);
      }
      map.fillStyle(COLORS.coralDeep, 0.9);
      for (const c of entry.corpses) {
        map.fillCircle(c.x * sx, c.y * sy, 1.6);
      }
      // Goal marker
      map.fillStyle(COLORS.sun, 1);
      map.fillCircle(entry.exit.x * sx, entry.exit.y * sy, 3);
      row.add(map);

      const label = entry.live ? `Level #${entry.seq} · Today (live)` : `Level #${entry.seq} · ${entry.date}`;
      const caption = this.add
        .text(-mapW / 2, rowH / 2 - 18, label, {
          fontFamily: FONTS.body,
          fontSize: '11.5px',
          fontStyle: '800',
          color: HEX.ink,
        })
        .setOrigin(0, 0.5);
      const count = this.add
        .text(mapW / 2, rowH / 2 - 18, `☠ ${entry.corpseCount} petrified`, {
          fontFamily: FONTS.body,
          fontSize: '11.5px',
          fontStyle: '800',
          color: HEX.coralDeep,
        })
        .setOrigin(1, 0.5);
      row.add(caption);
      row.add(count);

      row.setAlpha(0);
      this.tweens.add({
        targets: row,
        alpha: 1,
        y: y - 4,
        duration: 280,
        delay: i * 90,
        ease: 'Sine.easeOut',
      });
      this.rows.push(row);
    });
  }
}
