import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/widgets/loading_widget.dart';
import '../../core/widgets/error_widget.dart';
import '../../core/widgets/empty_widget.dart';
import 'inbox_provider.dart';
import 'widgets/email_tile.dart';

class InboxScreen extends ConsumerStatefulWidget {
  const InboxScreen({super.key});

  @override
  ConsumerState<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends ConsumerState<InboxScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      ref.read(inboxProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(inboxProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inbox'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search emails...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 20),
                        onPressed: () {
                          _searchController.clear();
                          ref.read(inboxProvider.notifier).setSearch('');
                        },
                      )
                    : null,
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
              onSubmitted: (query) => ref.read(inboxProvider.notifier).setSearch(query),
              onChanged: (value) => setState(() {}),
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.read(inboxProvider.notifier).loadEmails(),
        child: _buildBody(state, theme),
      ),
    );
  }

  Widget _buildBody(InboxState state, ThemeData theme) {
    if (state.isLoading && state.emails.isEmpty) {
      return const LoadingWidget(message: 'Loading emails...');
    }

    if (state.error != null && state.emails.isEmpty) {
      return AppErrorWidget(
        message: state.error!,
        onRetry: () => ref.read(inboxProvider.notifier).loadEmails(),
      );
    }

    if (state.emails.isEmpty) {
      return const EmptyWidget(
        icon: Icons.inbox_outlined,
        title: 'No emails yet',
        subtitle: 'Emails sent to your domains will appear here',
      );
    }

    return ListView.separated(
      controller: _scrollController,
      itemCount: state.emails.length + (state.isLoadingMore ? 1 : 0),
      separatorBuilder: (context2, index2) => Divider(height: 1, indent: 72, color: theme.dividerColor.withAlpha(60)),
      itemBuilder: (context, index) {
        if (index == state.emails.length) {
          return const Padding(
            padding: EdgeInsets.all(16),
            child: Center(child: CircularProgressIndicator()),
          );
        }

        final email = state.emails[index];
        return EmailTile(
          email: email,
          onTap: () => context.push('/email/${email.id}'),
          onDismissed: () {
            ref.read(inboxProvider.notifier).deleteEmails([email.id]);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Email deleted'), behavior: SnackBarBehavior.floating, duration: Duration(seconds: 2)),
            );
          },
        );
      },
    );
  }
}
