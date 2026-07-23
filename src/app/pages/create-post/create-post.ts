import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AiContent, AiVariant } from '../../services/ai-content';
import { ContentPlanApi } from '../../services/content-plan';
import { Post } from '../../services/post';
import { SocialAccount } from '../../services/social-account';
import { Toast } from '../../services/toast';

interface ChannelOption {
  key: string;
  name: string;
  color: string;
  abbr: string;
  limit: number | null;
}

const CHANNELS: ChannelOption[] = [
  { key: 'linkedin', name: 'LinkedIn', color: '#0a66c2', abbr: 'in', limit: 3000 },
  { key: 'x', name: 'X (Twitter)', color: '#111827', abbr: 'X', limit: 280 },
  { key: 'instagram', name: 'Instagram', color: '#e1306c', abbr: 'IG', limit: 2200 },
  { key: 'facebook', name: 'Facebook', color: '#1877f2', abbr: 'f', limit: null },
  { key: 'youtube', name: 'YouTube', color: '#ff0000', abbr: 'YT', limit: null },
];

// Key used to hold editor text while no channel is selected
const DRAFT_KEY = '_draft';

// Web compose/deep links per platform. Only X reliably prefills text —
// LinkedIn's text param truncates on ?/#, so we open its composer empty
// and rely on the clipboard (full text incl. hashtags is copied first).
const COMPOSE_LINKS: Record<string, (text: string) => string> = {
  x: (t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}`,
  linkedin: () => 'https://www.linkedin.com/feed/?shareActive=true',
  // Opens Instagram web's create dialog (falls back to the feed if not available)
  instagram: () => 'https://www.instagram.com/create/select/',
  facebook: () => 'https://www.facebook.com/',
  youtube: () => 'https://studio.youtube.com/upload',
};

@Component({
  selector: 'app-create-post',
  imports: [FormsModule, RouterLink],
  templateUrl: './create-post.html',
  styleUrl: './create-post.scss',
})
export class CreatePost implements OnInit {
  private ai = inject(AiContent);
  private postApi = inject(Post);
  private socialApi = inject(SocialAccount);
  private plansApi = inject(ContentPlanApi);
  private toast = inject(Toast);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly channels = CHANNELS;

  title = '';
  topic = '';
  mode: 'now' | 'schedule' = 'now';
  scheduledAt = '';
  // Split picker fields — combined into scheduledAt on confirm
  scheduleDate = '';
  scheduleTime = '09:00';

  readonly selected = signal<Set<string>>(new Set(['linkedin', 'x']));
  readonly activeChannel = signal<string>('linkedin');
  // Per-channel post text
  readonly contents = signal<Record<string, string>>({});
  readonly aiLoading = signal(false);
  readonly shortening = signal(false);
  readonly saving = signal(false);
  readonly variants = signal<AiVariant[]>([]);
  readonly hashtags = signal<string[]>([]);

  // Per-card regenerate state
  readonly regenerating = signal<string | null>(null);
  // Optional per-platform refinement instructions (bound to each card's input)
  notes: Record<string, string> = {};
  // Instruction typed in the main composer's rewrite bar
  refineNote = '';

  // AI image prompt panel
  readonly imagePrompt = signal<string | null>(null);
  readonly imagePromptLoading = signal(false);

  // Free tools that can turn the prompt into an image
  readonly imageTools = [
    { name: 'ChatGPT', url: 'https://chatgpt.com/' },
    { name: 'Gemini', url: 'https://gemini.google.com/' },
    { name: 'Bing Create', url: 'https://www.bing.com/images/create' },
  ];

  // Visual style modes — picking one regenerates the prompt in that style
  readonly imageStyles = [
    'Realistic photo',
    '3D render',
    'Flat illustration',
    'Minimalist',
    'Cinematic',
    'Hand-drawn',
  ];
  readonly imageStyle = signal<string | null>(null);

  // Header schedule popover
  readonly showSchedulePicker = signal(false);

  // Platforms actually connected in Social Accounts
  readonly connectedKeys = signal<Set<string>>(new Set());

  // "Not connected" dialog state
  readonly showDraftPrompt = signal(false);
  readonly unconnectedNames = signal('');

  // Set when editing an existing post (?id=123)
  readonly editingId = signal<number | null>(null);

  // Set when arriving from the Content Planner (?plan=..&item=..)
  private planRef: { planId: number; index: number } | null = null;

  readonly selectedChannels = computed(() =>
    this.channels.filter((c) => this.selected().has(c.key)),
  );

  /** Close the schedule popover on outside click or Escape. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (
      this.showSchedulePicker() &&
      !(event.target as HTMLElement).closest('.schedule-wrap')
    ) {
      this.showSchedulePicker.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showSchedulePicker()) this.showSchedulePicker.set(false);
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.queryParamMap.get('id');
    const isEditing = !!idParam && !Number.isNaN(+idParam);

    this.socialApi.list().subscribe({
      next: (accounts) => {
        const connected = new Set(
          accounts.filter((a) => a.connected).map((a) => a.platform),
        );
        this.connectedKeys.set(connected);

        // New post: default-select only the channels that are actually live
        if (!isEditing && connected.size > 0) {
          const keys = this.channels
            .filter((c) => connected.has(c.key))
            .map((c) => c.key);
          this.selected.set(new Set(keys));
          this.activeChannel.set(keys[0]);
        }
      },
      error: () => {},
    });

    if (isEditing) {
      this.loadPost(+idParam!);
    }

    // Arriving from the Content Planner: prefill the topic
    const params = this.route.snapshot.queryParamMap;
    const topicParam = params.get('topic');
    if (topicParam && !isEditing) {
      this.topic = topicParam;
      this.title = topicParam;
    }
    const planParam = params.get('plan');
    const itemParam = params.get('item');
    if (planParam && itemParam !== null && !Number.isNaN(+planParam) && !Number.isNaN(+itemParam)) {
      this.planRef = { planId: +planParam, index: +itemParam };
    }
  }

  isConnectedChannel(key: string): boolean {
    return this.connectedKeys().has(key);
  }

  /** Clearing the AI topic also clears the title it auto-filled. */
  clearTopic(): void {
    if (this.title.trim() === this.topic.trim()) {
      this.title = '';
    }
    this.topic = '';
  }

  private loadPost(id: number): void {
    this.postApi.get(id).subscribe({
      next: (post) => {
        this.editingId.set(post.id);
        this.title = post.title;

        if (post.platforms.length > 0) {
          this.selected.set(new Set(post.platforms));
        }

        // Restore per-channel versions; fall back to the shared content
        const map: Record<string, string> = {};
        for (const p of post.platforms) {
          map[p] = post.content_variants?.[p] ?? post.content ?? '';
        }
        if (post.platforms.length === 0 && post.content) {
          map[DRAFT_KEY] = post.content;
        }
        this.contents.set(map);

        const first = this.selectedChannels()[0];
        if (first) this.activeChannel.set(first.key);

        if (post.status === 'scheduled' && post.scheduled_at) {
          this.mode = 'schedule';
          this.scheduledAt = this.toLocalInput(new Date(post.scheduled_at));
          const [d, t] = this.scheduledAt.split('T');
          this.scheduleDate = d;
          this.scheduleTime = t;
        }
      },
      error: () => {
        this.toast.error('Could not load that post.', 'Edit post');
        this.router.navigate(['/scheduled-posts']);
      },
    });
  }

  private toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /** Earliest pickable schedule time — blocks past dates in the picker. */
  minScheduleAt(): string {
    return this.toLocalInput(new Date());
  }

  minDate(): string {
    return this.toLocalInput(new Date()).split('T')[0];
  }

  /** Quick scheduling shortcuts — only future ones are offered. */
  schedulePresets(): { label: string; date: string; time: string }[] {
    const now = new Date();
    const mk = (d: Date, label: string) => {
      const [date, time] = this.toLocalInput(d).split('T');
      return { label, date, time };
    };

    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    in1h.setMinutes(0, 0, 0);
    in1h.setHours(in1h.getHours() + 1);

    const tonight = new Date(now);
    tonight.setHours(19, 0, 0, 0);

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const monday = new Date(now);
    const diff = (8 - monday.getDay()) % 7 || 7;
    monday.setDate(now.getDate() + diff);
    monday.setHours(9, 0, 0, 0);

    return [
      mk(in1h, 'In 1 hour'),
      mk(tonight, 'Tonight 19:00'),
      mk(tomorrow, 'Tomorrow 09:00'),
      mk(monday, 'Monday 09:00'),
    ].filter((p) => new Date(`${p.date}T${p.time}`).getTime() > now.getTime());
  }

  applyPreset(p: { date: string; time: string }): void {
    this.scheduleDate = p.date;
    this.scheduleTime = p.time;
  }

  isPresetActive(p: { date: string; time: string }): boolean {
    return this.scheduleDate === p.date && this.scheduleTime === p.time;
  }

  /** “Sat, Jul 25 · 09:00” preview under the fields. */
  scheduleSummary(): string | null {
    if (!this.scheduleDate || !this.scheduleTime) return null;
    const d = new Date(`${this.scheduleDate}T${this.scheduleTime}`);
    if (Number.isNaN(d.getTime())) return null;
    return (
      d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' · ' +
      this.scheduleTime
    );
  }

  /** Character limit of the channel currently being edited. */
  readonly charLimit = computed(() => {
    const ch = this.channels.find((c) => c.key === this.activeChannel());
    return ch?.limit ?? null;
  });

  private editorKey(): string {
    return this.selected().size > 0 ? this.activeChannel() : DRAFT_KEY;
  }

  /** Text bound to the editor — proxies to the active channel's content. */
  get content(): string {
    return this.contents()[this.editorKey()] ?? '';
  }

  set content(value: string) {
    const key = this.editorKey();
    this.contents.update((map) => ({ ...map, [key]: value }));
  }

  contentFor(key: string): string {
    return this.contents()[key] ?? '';
  }

  isOver(key: string): boolean {
    const limit = this.channels.find((c) => c.key === key)?.limit ?? null;
    return limit !== null && this.contentFor(key).length > limit;
  }

  overActive(): boolean {
    return this.isOver(this.activeChannel());
  }

  activeChannelName(): string {
    return this.channelName(this.activeChannel());
  }

  isSelected(key: string): boolean {
    return this.selected().has(key);
  }

  toggle(key: string): void {
    this.selected.update((set) => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

    // Keep the active tab pointing at a selected channel
    if (!this.selected().has(this.activeChannel())) {
      const first = this.selectedChannels()[0];
      if (first) this.activeChannel.set(first.key);
    } else if (this.selected().size === 1) {
      this.activeChannel.set([...this.selected()][0]);
    }
  }

  setActive(key: string): void {
    this.activeChannel.set(key);
  }

  /** Single-bar behavior: off → select + edit; selected → edit; active → remove. */
  chipClick(key: string): void {
    if (!this.isSelected(key)) {
      this.selected.update((set) => new Set(set).add(key));
      this.activeChannel.set(key);
    } else if (this.activeChannel() !== key) {
      this.activeChannel.set(key);
    } else {
      this.toggle(key);
    }
  }

  chipTitle(c: ChannelOption): string {
    const limit = c.limit ? ` · ${c.limit} chars` : '';
    if (!this.isSelected(c.key)) return `Add ${c.name}${limit}`;
    if (this.activeChannel() !== c.key) return `Edit the ${c.name} version${limit}`;
    return `Editing ${c.name} — click again to remove it${limit}`;
  }

  channelName(key: string): string {
    return this.channels.find((c) => c.key === key)?.name ?? key;
  }

  channelColor(key: string): string {
    return this.channels.find((c) => c.key === key)?.color ?? '#64748b';
  }

  /** How full the active channel's limit is, capped at 100. */
  limitPct(): number {
    const limit = this.charLimit();
    if (limit === null) return 0;
    return Math.min((this.content.length / limit) * 100, 100);
  }

  applyToAll(): void {
    const text = this.content;
    this.contents.update((map) => {
      const next = { ...map };
      for (const key of this.selected()) next[key] = text;
      return next;
    });
    this.toast.info('Copied this version to all selected channels.');
  }

  generate(): void {
    if (!this.topic.trim()) {
      this.toast.warning('Give the AI a topic first.');
      return;
    }

    // Always generate for every platform — unselected ones are still useful
    // for manual copy/paste posting
    const allPlatforms = this.channels.map((c) => c.key);

    this.aiLoading.set(true);
    this.ai.generate(this.topic.trim(), allPlatforms).subscribe({
      next: (res) => {
        this.aiLoading.set(false);
        this.variants.set(res.variants);
        this.hashtags.set(res.hashtags);
        if (!this.title) this.title = this.topic.trim();

        // Fill every channel with its own version automatically
        this.contents.update((map) => {
          const next = { ...map };
          for (const v of res.variants) next[v.platform] = v.content;
          return next;
        });
        if (!this.selected().has(this.activeChannel())) {
          const first = this.selectedChannels()[0];
          if (first) this.activeChannel.set(first.key);
        }

        if (res.note) {
          this.toast.warning(res.note, 'AI Assistant');
        } else {
          this.toast.success(
            'Versions ready for all 5 platforms — copy, open, or publish.',
            'Generated',
          );
        }
      },
      error: (error) => {
        this.aiLoading.set(false);
        const detail =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Generation failed. Try again.';
        this.toast.error(detail, 'AI Assistant');
      },
    });
  }

  /** Rewrite the active channel's content using the composer's instruction bar. */
  refineActive(): void {
    this.regenerate(this.activeChannel(), this.refineNote);
  }

  regenerate(platform: string, instructionsInput?: string): void {
    if (!this.topic.trim()) {
      this.toast.warning('The AI needs the topic — fill it in above first.');
      return;
    }

    const instructions = (instructionsInput ?? this.notes[platform] ?? '').trim();
    this.regenerating.set(platform);

    this.ai.generate(this.topic.trim(), [platform], instructions || undefined).subscribe({
      next: (res) => {
        this.regenerating.set(null);
        const fresh = res.variants.find((v) => v.platform === platform);
        if (!fresh) {
          this.toast.error('No new version came back. Try again.', 'Regenerate');
          return;
        }

        // Swap only this platform's card and its editor tab content
        this.variants.update((list) =>
          list.map((v) => (v.platform === platform ? fresh : v)),
        );
        this.contents.update((map) => ({ ...map, [platform]: fresh.content }));

        if (res.note) {
          this.toast.warning(res.note, 'AI Assistant');
        } else {
          this.toast.success(
            `New ${this.channelName(platform)} version ready.`,
            'Regenerated',
          );
        }
      },
      error: (error) => {
        this.regenerating.set(null);
        const detail =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Regeneration failed. Try again.';
        this.toast.error(detail, 'AI Assistant');
      },
    });
  }

  // ── Manual publishing helpers (free — no platform API needed) ──

  /** Copy with fallback: modern clipboard API, then legacy execCommand. */
  private async copyText(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fall through to legacy method
    }
    return this.legacyCopy(text);
  }

  private legacyCopy(text: string): boolean {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  copyContent(): void {
    if (!this.content.trim()) {
      this.toast.warning('Nothing to copy yet.');
      return;
    }
    this.copyText(this.content).then((ok) =>
      ok
        ? this.toast.success(`${this.activeChannelName()} version copied.`, 'Copied')
        : this.toast.error('Could not copy — select the text and copy manually.'),
    );
  }

  copyVariant(v: AiVariant): void {
    this.copyText(v.content).then((ok) =>
      ok
        ? this.toast.success(`${this.channelName(v.platform)} version copied.`, 'Copied')
        : this.toast.error('Could not copy — select the text and copy manually.'),
    );
  }

  /** Copy the text and open the platform's compose page. */
  private openCompose(key: string, text: string): void {
    const link = COMPOSE_LINKS[key];
    if (!link) return;

    if (!text.trim()) {
      window.open(link(text), '_blank');
      return;
    }

    this.copyText(text).then((ok) => {
      window.open(link(text), '_blank');
      if (key === 'x') {
        this.toast.info('X opened with your text — just hit post.', 'Manual publish');
      } else if (key === 'instagram' && ok) {
        this.toast.info(
          'Instagram opened — pick your image first, then Ctrl+V the caption (it\'s in your clipboard). Instagram requires an image with every post.',
          'Manual publish',
        );
      } else if (ok) {
        this.toast.info(
          `${this.channelName(key)} opened — press Ctrl+V to paste your full post (hashtags included), then post.`,
          'Manual publish',
        );
      } else {
        this.toast.warning(
          `${this.channelName(key)} opened, but copying failed — come back, hit Copy, then paste it there.`,
          'Manual publish',
        );
      }
    });
  }

  openPlatform(): void {
    this.openCompose(this.activeChannel(), this.content);
  }

  openVariantPlatform(v: AiVariant): void {
    this.openCompose(v.platform, v.content);
  }

  generateImagePrompt(): void {
    const base = this.content.trim() || this.topic.trim();
    if (!base) {
      this.toast.warning('Write or generate the post first.');
      return;
    }

    this.imagePromptLoading.set(true);
    this.ai.imagePrompt(base, this.imageStyle() ?? undefined).subscribe({
      next: (res) => {
        this.imagePromptLoading.set(false);
        this.imagePrompt.set(res.prompt);
        if (res.note) this.toast.warning(res.note, 'Image prompt');
      },
      error: (error) => {
        this.imagePromptLoading.set(false);
        const detail =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Could not create the image prompt.';
        this.toast.error(detail, 'Image prompt');
      },
    });
  }

  /** Pick a style mode — regenerates the prompt in that visual style. */
  setImageStyle(style: string): void {
    this.imageStyle.set(this.imageStyle() === style ? null : style);
    this.generateImagePrompt();
  }

  openImageTool(tool: { name: string; url: string }): void {
    const prompt = this.imagePrompt();
    if (!prompt) return;
    this.copyText(prompt).then((ok) => {
      window.open(tool.url, '_blank');
      this.toast.info(
        ok
          ? `${tool.name} opened — the prompt is in your clipboard, paste it and generate.`
          : `${tool.name} opened — copy the prompt manually and paste it there.`,
        'Image prompt',
      );
    });
  }

  copyImagePrompt(): void {
    const prompt = this.imagePrompt();
    if (!prompt) return;
    this.copyText(prompt).then((ok) =>
      ok
        ? this.toast.success(
            'Paste it into ChatGPT, Gemini, Midjourney — any image tool.',
            'Prompt copied',
          )
        : this.toast.error('Could not copy — select the text and copy manually.'),
    );
  }

  /** Manual flow: the user already posted on the platform(s) themselves. */
  markAsPublished(): void {
    this.mode = 'now';
    this.showSchedulePicker.set(false);
    this.submit('publish', true);
  }

  /** "I posted it myself" chosen in the not-connected dialog. */
  confirmMarkPublished(): void {
    this.showDraftPrompt.set(false);
    this.markAsPublished();
  }

  confirmSchedule(): void {
    if (!this.scheduleDate || !this.scheduleTime) {
      this.toast.warning('Pick a date and time first.');
      return;
    }
    const when = new Date(`${this.scheduleDate}T${this.scheduleTime}`);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      this.toast.warning('That time is in the past — pick a future date and time.');
      return;
    }
    this.scheduledAt = `${this.scheduleDate}T${this.scheduleTime}`;
    this.mode = 'schedule';
    this.showSchedulePicker.set(false);
    this.submit('publish');
  }

  /** "Save as draft" chosen in the not-connected dialog. */
  confirmSaveDraft(): void {
    this.showDraftPrompt.set(false);
    this.submit('draft');
  }

  closeDraftPrompt(): void {
    this.showDraftPrompt.set(false);
  }

  useVariant(variant: AiVariant): void {
    this.contents.update((map) => ({ ...map, [variant.platform]: variant.content }));
    // Selecting the channel too, so its tab appears in the editor
    if (!this.selected().has(variant.platform)) {
      this.selected.update((set) => new Set(set).add(variant.platform));
    }
    this.activeChannel.set(variant.platform);
    this.toast.info(`Updated the ${this.channelName(variant.platform)} version.`);
  }

  addHashtag(tag: string): void {
    if (this.content.includes(tag)) return;
    this.content = this.content.trimEnd() + (this.content ? '\n\n' : '') + tag;
  }

  shorten(): void {
    const limit = this.charLimit();
    if (limit === null || !this.content) return;

    this.shortening.set(true);
    this.ai.shorten(this.content, limit).subscribe({
      next: (res) => {
        this.shortening.set(false);
        this.content = res.content;
        if (res.note) {
          this.toast.warning(res.note, 'Shorten');
        } else {
          this.toast.success(
            `Now ${res.content.length} characters — fits ${this.activeChannelName()}.`,
            'Shortened',
          );
        }
      },
      error: () => {
        this.shortening.set(false);
        this.toast.error('Could not shorten the post. Try again.', 'Shorten');
      },
    });
  }

  submit(status: 'draft' | 'publish', manual = false): void {
    if (!this.title.trim()) {
      this.toast.warning('Add a title before saving.');
      return;
    }
    if (status === 'publish' && this.selected().size === 0) {
      this.toast.warning('Select at least one channel.');
      return;
    }

    // Block publishing when any channel is over its own limit
    // (skipped for manual — the platform already accepted their post)
    if (status === 'publish' && !manual) {
      const over = this.selectedChannels().filter((c) => this.isOver(c.key));
      if (over.length > 0) {
        const names = over.map((c) => c.name).join(', ');
        this.toast.warning(
          `Content for ${names} is over the limit. Open that tab and shorten it first.`,
          'Too long',
        );
        this.activeChannel.set(over[0].key);
        return;
      }
    }

    // No connected channels — offer to keep the post as a draft instead.
    // Only relevant for "publish now"; scheduling just queues for manual
    // posting later, and manual mark-as-published skips it too.
    if (status === 'publish' && !manual && this.mode === 'now') {
      const connected = this.connectedKeys();
      const unconnected = this.selectedChannels().filter((c) => !connected.has(c.key));

      if (unconnected.length === this.selectedChannels().length) {
        this.unconnectedNames.set(unconnected.map((c) => c.name).join(', '));
        this.showDraftPrompt.set(true);
        return;
      } else if (unconnected.length > 0) {
        const names = unconnected.map((c) => c.name).join(', ');
        this.toast.warning(
          `${names} ${unconnected.length === 1 ? 'is' : 'are'} not connected — those channels won't receive the post.`,
          'Heads up',
        );
      }
    }

    let finalStatus: 'draft' | 'scheduled' | 'published' = 'draft';
    let scheduledAt: string | null = null;

    if (status === 'publish') {
      if (this.mode === 'schedule') {
        if (!this.scheduledAt) {
          this.toast.warning('Pick a date and time to schedule.');
          return;
        }
        if (new Date(this.scheduledAt).getTime() <= Date.now()) {
          this.toast.warning('That time is in the past — pick a future date and time.');
          return;
        }
        finalStatus = 'scheduled';
        scheduledAt = new Date(this.scheduledAt).toISOString();
      } else {
        finalStatus = 'published';
      }
    }

    const selectedKeys = [...this.selected()];
    const variants: Record<string, string> = {};
    for (const key of selectedKeys) variants[key] = this.contentFor(key);
    const primary = selectedKeys.length
      ? variants[selectedKeys[0]] ?? ''
      : this.contentFor(DRAFT_KEY);

    const payload = {
      title: this.title.trim(),
      content: primary,
      content_variants: variants,
      platforms: selectedKeys,
      status: finalStatus,
      scheduled_at: scheduledAt,
    };

    const editId = this.editingId();
    const request$ = editId !== null
      ? this.postApi.update(editId, payload)
      : this.postApi.create(payload);

    this.saving.set(true);
    request$.subscribe({
      next: () => {
        this.saving.set(false);
        const msg =
          finalStatus === 'published'
            ? manual
              ? 'Marked as published — nice work.'
              : 'Post published to your channels.'
            : finalStatus === 'scheduled'
              ? 'Post scheduled.'
              : editId !== null
                ? 'Draft updated.'
                : 'Draft saved.';
        this.toast.success(msg, 'Done');

        // Check off the planner item this post came from
        if (this.planRef) {
          this.plansApi
            .toggleItem(this.planRef.planId, this.planRef.index, true)
            .subscribe({ next: () => {}, error: () => {} });
        }

        this.router.navigate([editId !== null ? '/scheduled-posts' : '/dashboard']);
      },
      error: (error) => {
        this.saving.set(false);
        const detail =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Could not save the post.';
        this.toast.error(detail, 'Save failed');
      },
    });
  }
}
