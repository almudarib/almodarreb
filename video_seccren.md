```dart
// video_seccren.dart
//
// واجهة عرض الفيديوهات باستخدام Flutter:
// - قائمة/شبكة Responsive
// - تمرير لانهائي (Infinite Scroll)
// - عناصر تحكم أساسية (تشغيل/إيقاف/تحكم بالصوت)
// - تحديث تلقائي للبيانات
//
// المتطلبات الخارجية المقترحة (أضفها في pubspec.yaml عند الاستخدام الفعلي):
//   dependencies:
//     video_player: ^2.8.0
//     http: ^1.2.0 // إذا استخدمت VideoHttpService من الملف الآخر
//
// ملاحظة: يعتمد هذا الملف على النماذج والخدمة في video_service.dart.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

// افترض وجود هذه الاستيرادات ضمن مشروعك الفعلي:
// import 'video_service.dart';

// دالة مساعدة: تحديد إن كان الرابط فيديو مباشر (mp4/avi/webm/...)
bool isDirectVideoUrl(String url) {
  final s = url.toLowerCase();
  return s.endsWith('.mp4') ||
      s.endsWith('.webm') ||
      s.endsWith('.mkv') ||
      s.endsWith('.avi') ||
      s.endsWith('.mov') ||
      s.endsWith('.mpg') ||
      s.endsWith('.mpeg');
}

class VideoScreen extends StatefulWidget {
  final VideoService service;
  final ListSessionsQuery initialQuery;
  final Duration autoRefreshInterval;

  const VideoScreen({
    super.key,
    required this.service,
    this.initialQuery = const ListSessionsQuery(
      isActive: true,
      kind: 'video',
      sortBy: 'created_at',
      sortDir: 'desc',
      page: 1,
      perPage: 10,
    ),
    this.autoRefreshInterval = const Duration(minutes: 1),
  });

  @override
  State<VideoScreen> createState() => _VideoScreenState();
}

class _VideoScreenState extends State<VideoScreen> {
  final ScrollController _scroll = ScrollController();
  final Map<String, VideoPlayerController> _controllers = {};

  List<SessionRecord> _items = [];
  int _page = 1;
  int _perPage = 10;
  int? _total;
  bool _loading = false;
  String? _error;
  Timer? _autoRefreshTimer;

  ListSessionsQuery get _query => widget.initialQuery.copyWith(page: _page, perPage: _perPage);

  @override
  void initState() {
    super.initState();
    _perPage = widget.initialQuery.perPage;
    _page = widget.initialQuery.page;
    _loadPage(reset: true);
    _scroll.addListener(_onScroll);
    _autoRefreshTimer = Timer.periodic(widget.autoRefreshInterval, (_) => _refresh());
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    _scroll.removeListener(_onScroll);
    for (final c in _controllers.values) {
      c.dispose();
    }
    _controllers.clear();
    super.dispose();
  }

  void _onScroll() {
    if (_loading) return;
    if (!_hasMore) return;
    final pos = _scroll.position;
    if (pos.maxScrollExtent - pos.pixels < 300) {
      _loadNextPage();
    }
  }

  bool get _hasMore {
    if (_total == null) return true; // إذا لم نعرف الإجمالي، نفترض وجود المزيد
    return _items.length < _total!;
  }

  Future<void> _refresh() async {
    if (_loading) return;
    _page = 1;
    await _loadPage(reset: true);
  }

  Future<void> _loadNextPage() async {
    if (_loading) return;
    _page += 1;
    await _loadPage(reset: false);
  }

  Future<void> _loadPage({required bool reset}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await widget.service.getSessions(_query);
      setState(() {
        _perPage = res.perPage;
        _total = res.total;
        _items = reset ? res.sessions : [..._items, ...res.sessions];
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        if (reset) {
          _items = [];
          _total = 0;
        }
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<VideoPlayerController?> _ensureController(String url) async {
    if (!isDirectVideoUrl(url)) return null; // نتجاهل روابط غير مباشرة (مثل يوتيوب)
    final existing = _controllers[url];
    if (existing != null) {
      if (existing.value.isInitialized) return existing;
      try {
        await existing.initialize();
        return existing;
      } catch (_) {
        return existing;
      }
    }
    final controller = VideoPlayerController.networkUrl(Uri.parse(url));
    _controllers[url] = controller;
    try {
      await controller.initialize();
      controller.setLooping(true);
    } catch (_) {}
    return controller;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('عرض الفيديوهات')),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            final columns = width < 600
                ? 1
                : width < 900
                    ? 2
                    : 3;
            return CustomScrollView(
              controller: _scroll,
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (_error != null)
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.redAccent),
                            ),
                            child: Text(_error!, style: const TextStyle(color: Colors.red)),
                          ),
                      ],
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  sliver: SliverGrid(
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: columns,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 16 / 10,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        if (index >= _items.length) return const SizedBox.shrink();
                        final item = _items[index];
                        return _VideoTile(
                          title: item.title,
                          url: item.videoUrl,
                          ensureController: _ensureController,
                        );
                      },
                      childCount: _items.length,
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Center(
                      child: _loading
                          ? const CircularProgressIndicator()
                          : (_hasMore
                              ? const SizedBox.shrink()
                              : Text('تم عرض كل العناصر (${_items.length}${_total != null ? '/$_total' : ''})')),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _refresh,
        icon: const Icon(Icons.refresh),
        label: const Text('تحديث'),
      ),
    );
  }
}

class _VideoTile extends StatefulWidget {
  final String title;
  final String url;
  final Future<VideoPlayerController?> Function(String url) ensureController;

  const _VideoTile({
    required this.title,
    required this.url,
    required this.ensureController,
  });

  @override
  State<_VideoTile> createState() => _VideoTileState();
}

class _VideoTileState extends State<_VideoTile> {
  VideoPlayerController? _controller;
  bool _initializing = false;
  double _volume = 1.0;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    setState(() => _initializing = true);
    final c = await widget.ensureController(widget.url);
    if (!mounted) return;
    setState(() {
      _controller = c;
      _initializing = false;
    });
  }

  void _togglePlay() {
    final c = _controller;
    if (c == null || !c.value.isInitialized) return;
    if (c.value.isPlaying) {
      c.pause();
    } else {
      c.play();
    }
    setState(() {});
  }

  void _setVolume(double v) {
    _volume = v.clamp(0.0, 1.0);
    final c = _controller;
    if (c != null) {
      c.setVolume(_volume);
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final isDirect = isDirectVideoUrl(widget.url);
    return Card(
      elevation: 2,
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Expanded(
            child: Container(
              color: Colors.black,
              child: isDirect
                  ? (_initializing
                      ? const Center(child: CircularProgressIndicator())
                      : (_controller != null && _controller!.value.isInitialized
                          ? Stack(
                              alignment: Alignment.bottomCenter,
                              children: [
                                Center(
                                  child: AspectRatio(
                                    aspectRatio: _controller!.value.aspectRatio == 0
                                        ? 16 / 9
                                        : _controller!.value.aspectRatio,
                                    child: VideoPlayer(_controller!),
                                  ),
                                ),
                                Container(
                                  color: Colors.black.withOpacity(0.25),
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                  child: Row(
                                    children: [
                                      IconButton(
                                        icon: Icon(
                                          _controller!.value.isPlaying ? Icons.pause : Icons.play_arrow,
                                          color: Colors.white,
                                        ),
                                        onPressed: _togglePlay,
                                      ),
                                      const SizedBox(width: 8),
                                      const Icon(Icons.volume_up, color: Colors.white),
                                      Expanded(
                                        child: Slider(
                                          value: _volume,
                                          min: 0,
                                          max: 1,
                                          divisions: 10,
                                          onChanged: _setVolume,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            )
                          : const Center(
                              child: Icon(Icons.videocam_off, color: Colors.white54, size: 42),
                            )))
                  : Center(
                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.link, color: Colors.white70, size: 36),
                            const SizedBox(height: 8),
                            const Text(
                              'هذا الرابط ليس فيديو مباشر مدعومًا هنا',
                              style: TextStyle(color: Colors.white),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 6),
                            Text(
                              widget.url,
                              style: const TextStyle(color: Colors.white70, fontSize: 12),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),
            ),
          ),
          Container(
            width: double.infinity,
            color: Colors.white,
            padding: const EdgeInsets.all(10),
            child: Text(
              widget.title,
              style: const TextStyle(fontWeight: FontWeight.w600),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

// ===========================
// اختبارات وحدة أساسية (Dart)
// ===========================
// الاختبارات هنا تركز على منطق التمرير اللانهائي/التحديث ضمن Controller مبسط،
// لتجنب تعقيدات اختبار Widgets كاملة.
//
// ضع هذه الفئة في ملف مستقل للاختبار الفعلي:
/*
import 'package:test/test.dart';

class VideoFeedController {
  final VideoService service;
  List<SessionRecord> items = [];
  int page = 1;
  int perPage = 10;
  int? total;
  bool loading = false;
  String? error;

  VideoFeedController(this.service);

  Future<void> load({bool reset = false}) async {
    if (loading) return;
    loading = true;
    try {
      final res = await service.getSessions(ListSessionsQuery(page: page, perPage: perPage, isActive: true, kind: 'video'));
      perPage = res.perPage;
      total = res.total;
      items = reset ? res.sessions : [...items, ...res.sessions];
    } catch (e) {
      error = e.toString();
      if (reset) {
        items = [];
        total = 0;
      }
    } finally {
      loading = false;
    }
  }
}

void main() {
  test('infinite scroll loads next pages', () async {
    final now = DateTime.now();
    final data = List.generate(35, (i) {
      return SessionRecord(
        id: i + 1,
        title: 'فيديو $i',
        videoUrl: 'https://cdn/v$i.mp4',
        language: 'AR',
        orderNumber: i + 1,
        isActive: true,
        createdAt: now.subtract(Duration(minutes: i)),
      );
    });
    final svc = InMemoryVideoService(data);
    final c = VideoFeedController(svc);
    await c.load(reset: true); // page=1
    expect(c.items.length, 10);
    c.page = 2;
    await c.load(reset: false);
    expect(c.items.length, 20);
    c.page = 3;
    await c.load(reset: false);
    expect(c.items.length, 30);
    c.page = 4;
    await c.load(reset: false);
    expect(c.items.length, 35); // آخر صفحة فيها 5 عناصر
  });

  test('error handling sets error and resets when reset=true', () async {
    final svc = _FailingService();
    final c = VideoFeedController(svc);
    await c.load(reset: true);
    expect(c.error != null, true);
    expect(c.items.isEmpty, true);
  });
}

class _FailingService implements VideoService {
  @override
  Future<PagedSessions> getSessions(ListSessionsQuery query) async {
    throw Exception('فشل الجلب');
  }
}
*/
```
