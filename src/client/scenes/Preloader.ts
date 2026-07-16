import { Scene } from 'phaser';
import { fetchInit } from '../net/api';
import { reportAppReady } from '../journeys';

export class Preloader extends Scene {
  private initReady!: Promise<void>;

  constructor() {
    super('Preloader');
  }

  init() {
    this.add.image(this.scale.width / 2, this.scale.height / 2, 'background')
      .setDisplaySize(this.scale.width, this.scale.height);

    this.add
      .text(this.scale.width / 2, this.scale.height * 0.35, 'Chroma Canvas', {
        fontFamily: 'Arial Black',
        fontSize: '42px',
        color: '#e8d5ff',
        stroke: '#2a1040',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const bar = this.add.rectangle(
      this.scale.width / 2 - 158,
      this.scale.height * 0.55,
      4,
      20,
      0xff6bcb
    ).setOrigin(0, 0.5);

    this.load.on('progress', (p: number) => {
      bar.width = 4 + 312 * p;
    });

    this.initReady = fetchInit()
      .then((data) => {
        this.registry.set('init', data);
      })
      .catch((err) => {
        console.error('init fetch failed', err);
      });
  }

  preload() {
    this.load.setPath('../assets');
    this.load.image('logo', 'logo.png');

    const shard = this.make.graphics({ x: 0, y: 0 });
    shard.fillStyle(0xffffff);
    shard.fillRect(0, 0, 6, 6);
    shard.generateTexture('shard', 6, 6);
    shard.destroy();
  }

  create() {
    void this.initReady.then(() => {
      reportAppReady();
      this.scene.start('MainMenu');
    });
  }
}
