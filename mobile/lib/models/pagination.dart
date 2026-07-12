class Pagination {
  final int page;
  final int limit;
  final int total;
  final int totalPages;

  const Pagination({required this.page, required this.limit, required this.total, required this.totalPages});

  factory Pagination.fromJson(Map<String, dynamic> json) => Pagination(
    page: json['page'] as int? ?? 1,
    limit: json['limit'] as int? ?? 20,
    total: json['total'] as int? ?? 0,
    totalPages: json['totalPages'] as int? ?? 1,
  );

  Map<String, dynamic> toJson() => {'page': page, 'limit': limit, 'total': total, 'totalPages': totalPages};

  bool get hasMore => page < totalPages;
}

class PaginatedResponse<T> {
  final List<T> items;
  final Pagination pagination;

  const PaginatedResponse({required this.items, required this.pagination});
}
