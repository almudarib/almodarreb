```dart
// video_service.dart
//
// خدمة جلب الفيديوهات + نماذج البيانات + تدفق تحديث تلقائي + اختبارات.
// الهدف: مطابقة فكرة الاستعلام والعرض في صفحات Next.js (listSessions)
// مع التركيز على جلب قائمة الفيديوهات، معالجة الأخطاء، والتحديث التلقائي.
//
// المتطلبات الخارجية المقترحة (أضفها في pubspec.yaml عند الاستخدام الفعلي):
//   dependencies:
//     http: ^1.2.0
//
// ملاحظة: لتسهيل الاختبار هنا، نوفر مصدر بيانات وهمي (InMemoryVideoService)
// بالإضافة إلى خدمة HTTP عامة يمكن تهيئتها لاحقًا نحو API خارجي.

import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

// نموذج الفيديو/الجلسة مماثل لما هو مستخدم في Next.js
class SessionRecord {
  final int id;
  final String title;
  final String videoUrl;
  final String language;
  final int? orderNumber;
  final bool isActive;
  final DateTime createdAt;

  SessionRecord({
    required this.id,
    required this.title,
    required this.videoUrl,
    required this.language,
    required this.orderNumber,
    required this.isActive,
    required this.createdAt,
  });

  factory SessionRecord.fromJson(Map<String, dynamic> json) {
    return SessionRecord(
      id: json['id'] as int,
      title: json['title'] as String,
      videoUrl: json['video_url'] as String,
      language: json['language'] as String,
      orderNumber: json['order_number'] == null ? null : json['order_number'] as int,
      isActive: (json['is_active'] as bool?) ?? true,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'video_url': videoUrl,
      'language': language,
      'order_number': orderNumber,
      'is_active': isActive,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

// نتيجة ذات صفحات، تماثل ناتج listSessions (page, perPage, total)
class PagedSessions {
  final List<SessionRecord> sessions;
  final int page;
  final int perPage;
  final int? total; // قد لا يكون متاحًا دائمًا

  PagedSessions({
    required this.sessions,
    required this.page,
    required this.perPage,
    required this.total,
  });
}

// معايير الاستعلام تماثل ListSessionsQuery في Next.js
class ListSessionsQuery {
  final String? language;
  final bool? isActive;
  final String? kind; // 'video' | 'file'
  final String? search;
  final String sortBy; // 'created_at' | 'title' | 'order_number'
  final String sortDir; // 'asc' | 'desc'
  final int page;
  final int perPage;

  const ListSessionsQuery({
    this.language,
    this.isActive,
    this.kind,
    this.search,
    this.sortBy = 'created_at',
    this.sortDir = 'desc',
    this.page = 1,
    this.perPage = 10,
  });

  ListSessionsQuery copyWith({
    String? language,
    bool? isActive,
    String? kind,
    String? search,
    String? sortBy,
    String? sortDir,
    int? page,
    int? perPage,
  }) {
    return ListSessionsQuery(
      language: language ?? this.language,
      isActive: isActive ?? this.isActive,
      kind: kind ?? this.kind,
      search: search ?? this.search,
      sortBy: sortBy ?? this.sortBy,
      sortDir: sortDir ?? this.sortDir,
      page: page ?? this.page,
      perPage: perPage ?? this.perPage,
    );
  }

  Map<String, String> toQueryParams() {
    final Map<String, String> m = {
      'sort_by': sortBy,
      'sort_dir': sortDir,
      'page': page.toString(),
      'per_page': perPage.toString(),
    };
    if (language != null && language!.trim().isNotEmpty) m['language'] = language!;
    if (isActive != null) m['is_active'] = isActive! ? 'true' : 'false';
    if (kind != null && kind!.trim().isNotEmpty) m['kind'] = kind!;
    if (search != null && search!.trim().isNotEmpty) m['search'] = search!;
    return m;
  }
}

// أدوات مساعدة بسيطة تماثل منطق Next.js لتحويل المرجع التخزيني إلى رابط عام
bool isStorageRef(String url) => url.startsWith('storage://');

String toPublicUrl(String url, {String? publicBase}) {
  if (!isStorageRef(url)) return url;
  final without = url.substring('storage://'.length);
  final slash = without.indexOf('/');
  if (slash <= 0) return url;
  final bucket = without.substring(0, slash);
  final path = without.substring(slash + 1);
  final base = (publicBase ?? '').trim().replaceAll(RegExp(r'/+$'), '');
  if (base.isEmpty) return url;
  return '$base/$bucket/$path';
}

// واجهة الخدمة
abstract class VideoService {
  Future<PagedSessions> getSessions(ListSessionsQuery query);

  // تدفق تحديث تلقائي: يجلب نفس الاستعلام كل فترة زمنية ويصدر النتائج
  Stream<PagedSessions> watchSessions(ListSessionsQuery query, {Duration interval = const Duration(minutes: 1)}) {
    final controller = StreamController<PagedSessions>();
    Timer? timer;
    bool closed = false;

    Future<void> tick() async {
      try {
        final res = await getSessions(query);
        if (!closed) controller.add(res);
      } catch (e) {
        if (!closed) controller.addError(e);
      }
    }

    // أول مرة فورًا
    tick();
    timer = Timer.periodic(interval, (_) => tick());

    controller.onCancel = () {
      closed = true;
      timer?.cancel();
    };
    return controller.stream;
  }
}

// خدمة HTTP عامة: تتوقع API يعيد نفس شكل البيانات
class VideoHttpService implements VideoService {
  final String baseUrl; // مثال: https://example.com/api
  final http.Client _client;
  final String? publicBase; // لتحويل storage:// إلى رابط عام إن لزم

  VideoHttpService({
    required this.baseUrl,
    http.Client? client,
    this.publicBase,
  }) : _client = client ?? http.Client();

  Uri _buildUri(ListSessionsQuery q) {
    return Uri.parse('$baseUrl/sessions').replace(queryParameters: q.toQueryParams());
  }

  @override
  Future<PagedSessions> getSessions(ListSessionsQuery query) async {
    final uri = _buildUri(query);
    http.Response resp;
    try {
      resp = await _client.get(uri);
    } catch (e) {
      throw Exception('فشل الاتصال بالخادم: ${e.toString()}');
    }
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw Exception('فشل الجلب، رمز الحالة: ${resp.statusCode}');
    }
    Map<String, dynamic> jsonBody;
    try {
      jsonBody = json.decode(resp.body) as Map<String, dynamic>;
    } catch (e) {
      throw Exception('فشل تحليل الاستجابة');
    }
    final rawSessions = (jsonBody['sessions'] as List<dynamic>? ?? [])
        .map((e) => e as Map<String, dynamic>)
        .map((row) {
          // محاكاة تحويل الروابط التخزينية إلى عامة لو تم تمرير publicBase
          final v = Map<String, dynamic>.from(row);
          final u = (v['video_url'] as String?) ?? '';
          if (isStorageRef(u) && publicBase != null && publicBase!.isNotEmpty) {
            v['video_url'] = toPublicUrl(u, publicBase: publicBase);
          }
          return SessionRecord.fromJson(v);
        })
        .toList();
    return PagedSessions(
      sessions: rawSessions,
      page: (jsonBody['page'] as int?) ?? query.page,
      perPage: (jsonBody['perPage'] as int?) ?? query.perPage,
      total: jsonBody['total'] == null ? null : (jsonBody['total'] as int),
    );
  }
}

// خدمة ذاكرة داخلية لأغراض الاختبار
class InMemoryVideoService implements VideoService {
  final List<SessionRecord> _data;
  final String? publicBase;

  InMemoryVideoService(this._data, {this.publicBase});

  @override
  Future<PagedSessions> getSessions(ListSessionsQuery query) async {
    // تصفية مبدئية حسب المعايير
    Iterable<SessionRecord> items = _data;
    if (query.language != null) {
      items = items.where((e) => e.language.toLowerCase() == query.language!.toLowerCase());
    }
    if (query.isActive != null) {
      items = items.where((e) => e.isActive == query.isActive);
    }
    if (query.kind != null) {
      final k = query.kind!.toLowerCase();
      bool isVideoUrl(String u) {
        final s = u.toLowerCase();
        return s.endsWith('.mp4') ||
            s.endsWith('.avi') ||
            s.endsWith('.mov') ||
            s.endsWith('.webm') ||
            s.endsWith('.mkv') ||
            s.endsWith('.mpg') ||
            s.endsWith('.mpeg') ||
            s.contains('youtube.com') ||
            s.contains('youtu.be') ||
            s.startsWith('storage://');
      }

      bool isDocUrl(String u) {
        final s = u.toLowerCase();
        return s.endsWith('.pdf') || s.endsWith('.ppt') || s.endsWith('.pptx') || s.endsWith('.doc') || s.endsWith('.docx');
      }

      items = items.where((e) => k == 'video' ? isVideoUrl(e.videoUrl) : isDocUrl(e.videoUrl));
    }
    if (query.search != null && query.search!.trim().isNotEmpty) {
      final term = query.search!.toLowerCase();
      items = items.where((e) => e.title.toLowerCase().contains(term));
    }

    // ترتيب
    List<SessionRecord> list = items.toList();
    int cmpAscDesc(int v) => query.sortDir.toLowerCase() == 'asc' ? v : -v;
    switch (query.sortBy) {
      case 'title':
        list.sort((a, b) => cmpAscDesc(a.title.compareTo(b.title)));
        break;
      case 'order_number':
        list.sort((a, b) => cmpAscDesc((a.orderNumber ?? 0).compareTo(b.orderNumber ?? 0)));
        break;
      default:
        list.sort((a, b) => cmpAscDesc(a.createdAt.compareTo(b.createdAt)));
    }

    // تحويل روابط التخزين إن لزم
    if (publicBase != null && publicBase!.isNotEmpty) {
      list = list
          .map((e) => isStorageRef(e.videoUrl)
              ? SessionRecord(
                  id: e.id,
                  title: e.title,
                  videoUrl: toPublicUrl(e.videoUrl, publicBase: publicBase),
                  language: e.language,
                  orderNumber: e.orderNumber,
                  isActive: e.isActive,
                  createdAt: e.createdAt,
                )
              : e)
          .toList();
    }

    // ترقيم الصفحات
    final start = (query.page - 1) * query.perPage;
    final end = (start + query.perPage).clamp(0, list.length);
    final slice = start >= list.length ? <SessionRecord>[] : list.sublist(start, end);
    return PagedSessions(sessions: slice, page: query.page, perPage: query.perPage, total: list.length);
  }
}

// ===========================
// اختبارات وحدة أساسية (Dart)
// ===========================
// يمكن تشغيلها في مشروع Dart/Flutter عبر:
//   flutter test
// أو:
//   dart test
//
// الاختبارات هنا تتحقق من:
//   - ترقيم الصفحات
//   - الترتيب والتصفية
//   - تحويل روابط storage:// إلى روابط عامة
//   - تدفق التحديث التلقائي (باستخدام Stream)

// ضع هذا الكود في ملف اختبار مستقل عند دمجه فعليًا:
/*
import 'package:test/test.dart';

void main() {
  final now = DateTime.now();
  final data = List.generate(30, (i) {
    return SessionRecord(
      id: i + 1,
      title: 'فيديو رقم ${i + 1}',
      videoUrl: i % 3 == 0 ? 'storage://session-videos/sessions/2026/01/08/$i.mp4' : 'https://cdn.example.com/v$i.mp4',
      language: i % 2 == 0 ? 'AR' : 'EN',
      orderNumber: i + 1,
      isActive: i % 5 != 0,
      createdAt: now.subtract(Duration(minutes: i)),
    );
  });

  group('InMemoryVideoService', () {
    test('paginates and sorts by created_at desc default', () async {
      final svc = InMemoryVideoService(data);
      final res = await svc.getSessions(const ListSessionsQuery(perPage: 10));
      expect(res.sessions.length, 10);
      // أول عنصر يجب أن يكون أحدث تاريخًا
      expect(res.sessions.first.createdAt.isAfter(res.sessions.last.createdAt), true);
    });

    test('filters by is_active and kind=video', () async {
      final svc = InMemoryVideoService(data);
      final res = await svc.getSessions(const ListSessionsQuery(isActive: true, kind: 'video', perPage: 50));
      // جميع العناصر نشطة
      expect(res.sessions.every((e) => e.isActive == true), true);
    });

    test('converts storage refs when publicBase provided', () async {
      final svc = InMemoryVideoService(data, publicBase: 'https://public.example.com/storage/v1/object/public');
      final res = await svc.getSessions(const ListSessionsQuery(perPage: 50));
      final hasConverted = res.sessions.any((e) => e.videoUrl.startsWith('https://public.example.com'));
      expect(hasConverted, true);
    });

    test('watchSessions emits periodically', () async {
      final svc = InMemoryVideoService(data);
      final stream = svc.watchSessions(const ListSessionsQuery(perPage: 5), interval: const Duration(milliseconds: 200));
      int count = 0;
      final sub = stream.listen((_) => count++);
      await Future.delayed(const Duration(milliseconds: 650));
      await sub.cancel();
      expect(count >= 2, true);
    });
  });
}
*/
```
