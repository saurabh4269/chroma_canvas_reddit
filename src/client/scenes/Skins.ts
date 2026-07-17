import { Scene, GameObjects } from 'phaser';
import { purchase, OrderResultStatus, showToast } from '@devvit/web/client';
import type { SkinCatalogItem, SkinsResponse } from '../../shared/api';
import {
  fetchSkins,
  postClaimDemoSkins,
  postEquipSkin,
} from '../net/api';
import { COLORS, FONTS, HEX } from '../theme';
import {
  addCard,
  addDisplayTitle,
  addGameButton,
  drawSunnyBackdrop,
} from '../ui/phaserUi';

/**
 * Cosmetic skin picker — equip free skins, buy gold trails, or claim
 * playtest unlocks when Payments checkout is unavailable.
 */
export class Skins extends Scene {
  private status!: GameObjects.Text;
  private listRoot!: GameObjects.Container;
  private busy = false;

  constructor() {
    super('Skins');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.resize(width, height);
    drawSunnyBackdrop(this, width, height);

    addDisplayTitle(this, width / 2, height * 0.08, 'Orb Skins', 34);
    this.add
      .text(width / 2, height * 0.145, 'Cosmetic only — no jump or speed boosts', {
        fontFamily: FONTS.body,
        fontSize: '13px',
        fontStyle: '700',
        color: HEX.ink,
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    this.status = this.add
      .text(width / 2, height * 0.42, 'Loading skins…', {
        fontFamily: FONTS.body,
        fontSize: '15px',
        fontStyle: '700',
        color: HEX.inkSoft,
      })
      .setOrigin(0.5);

    this.listRoot = this.add.container(0, 0);

    addGameButton(
      this,
      width / 2 - 88,
      height - 44,
      'Unlock all',
      'ghost',
      () => {
        void this.claimDemo();
      },
      150,
      40
    );

    addGameButton(
      this,
      width / 2 + 88,
      height - 44,
      'Back',
      'coral',
      () => this.scene.start('MainMenu'),
      140,
      40
    );

    void this.reload();
  }

  private async reload() {
    try {
      const res = await fetchSkins();
      if (!this.scene.isActive()) return;
      this.status.setVisible(false);
      this.renderCatalog(res);
      // Keep init player in sync so Game picks up equipped skin.
      const init = this.registry.get('init') as
        | { player?: { equippedSkin?: string; unlockedSkins?: string[] } }
        | undefined;
      if (init?.player) {
        init.player.equippedSkin = res.equippedSkin;
        init.player.unlockedSkins = res.unlockedSkins;
      }
    } catch {
      this.status.setText('Could not load skins.\nTry again in a moment.');
    }
  }

  private renderCatalog(res: SkinsResponse) {
    this.listRoot.removeAll(true);
    const { width, height } = this.scale;
    const items = res.catalog;
    const rowH = Math.min(64, (height * 0.58) / Math.max(items.length, 1));
    const startY = height * 0.2;
    const cardW = Math.min(width * 0.92, 420);

    items.forEach((item, i) => {
      const y = startY + i * rowH + rowH / 2;
      const row = this.add.container(width / 2, y);
      const card = addCard(this, 0, 0, cardW, rowH - 8, 14);
      row.add(card);

      const swatch = this.add.graphics();
      swatch.fillStyle(item.preview.orbGlow, 0.35);
      swatch.fillCircle(-cardW / 2 + 28, 0, 16);
      swatch.fillStyle(item.preview.orb, 1);
      swatch.fillCircle(-cardW / 2 + 28, 0, 11);
      swatch.lineStyle(2, COLORS.inkOutline, 1);
      swatch.strokeCircle(-cardW / 2 + 28, 0, 11);
      row.add(swatch);

      const title = this.add
        .text(-cardW / 2 + 52, -10, item.name, {
          fontFamily: FONTS.body,
          fontSize: '14px',
          fontStyle: '800',
          color: HEX.ink,
        })
        .setOrigin(0, 0.5);
      const sub = this.add
        .text(-cardW / 2 + 52, 10, this.unlockLabel(item), {
          fontFamily: FONTS.body,
          fontSize: '11px',
          fontStyle: '700',
          color: HEX.inkSoft,
        })
        .setOrigin(0, 0.5);
      row.add([title, sub]);

      const actionLabel = item.equipped
        ? 'Equipped'
        : item.unlocked
          ? 'Equip'
          : item.unlock.kind === 'purchase'
            ? `${item.unlock.priceGold}g`
            : item.unlock.kind === 'wins'
              ? `${item.unlock.count} wins`
              : 'Free';

      const btn = addGameButton(
        this,
        cardW / 2 - 56,
        0,
        actionLabel,
        item.equipped ? 'ghost' : 'coral',
        () => {
          void this.onSkinAction(item);
        },
        96,
        34
      );
      if (item.equipped) {
        btn.container.setAlpha(0.75);
      }
      row.add(btn.container);
      this.listRoot.add(row);
    });
  }

  private unlockLabel(item: SkinCatalogItem): string {
    if (item.equipped) return 'Currently equipped';
    if (item.unlocked) return 'Unlocked · tap Equip';
    if (item.unlock.kind === 'free') return 'Free for everyone';
    if (item.unlock.kind === 'wins') {
      return `Unlocks at ${item.unlock.count} wins`;
    }
    return `Buy with Reddit Gold · cosmetic`;
  }

  private async onSkinAction(item: SkinCatalogItem) {
    if (this.busy || item.equipped) return;
    this.busy = true;
    try {
      if (item.unlocked) {
        const res = await postEquipSkin(item.id);
        if (res.ok) {
          showToast('Skin equipped');
          await this.reload();
        } else {
          showToast(res.message ?? 'Could not equip');
        }
        return;
      }
      if (item.unlock.kind === 'purchase') {
        try {
          const result = await purchase(item.unlock.sku);
          if (result.status === OrderResultStatus.STATUS_SUCCESS) {
            await postEquipSkin(item.id);
            showToast('Purchased & equipped!');
            await this.reload();
          } else {
            showToast('Purchase cancelled — use Unlock all for playtest');
          }
        } catch {
          showToast('Payments unavailable — tap Unlock all');
        }
        return;
      }
      showToast('Keep climbing to unlock this skin');
    } finally {
      this.busy = false;
    }
  }

  private async claimDemo() {
    if (this.busy) return;
    this.busy = true;
    try {
      const res = await postClaimDemoSkins();
      showToast(res.message);
      await this.reload();
    } catch {
      showToast('Could not unlock demo skins');
    } finally {
      this.busy = false;
    }
  }
}
