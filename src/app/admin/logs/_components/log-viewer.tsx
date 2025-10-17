"use client";

import { useState, useEffect, useTransition, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import {
	getLogsAction,
	clearLogsAction,
	type GetLogsResult
} from '@/lib/actions/log.actions';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Trash2, Search, X, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatBytes } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function LogViewer() {
	// Данные
	const [logs, setLogs] = useState<string[]>([]);
	const [nextPageToken, setNextPageToken] = useState<string | null>(null);

	// UI
	const [info, setInfo] = useState<{ message?: string, logFilePath?: string, logFileExists?: boolean } | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [source, setSource] = useState<'cloud' | 'local' | null>(null);
	const [logSize, setLogSize] = useState<number | undefined>(undefined);
	const [filter, setFilter] = useState('');

	// Переходы
	const [isFetching, startFetching] = useTransition();
	const [isClearing, startClearing] = useTransition();
	const [isLoadingMore, startLoadingMore] = useTransition();

	const { toast } = useToast();
	const isAnyLoading = isFetching || isClearing || isLoadingMore;

	// --- Логика плавной прокрутки ---
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const [scrollState, setScrollState] = useState<{ scrollHeight: number; scrollTop: number; } | null>(null);

	useLayoutEffect(() => {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
		if (scrollState && viewport) {
			viewport.scrollTop = viewport.scrollHeight - (scrollState.scrollHeight - scrollState.scrollTop);
			setScrollState(null); // Сбрасываем состояние после применения
		}
	}, [logs, scrollState]);

	const fetchLogs = useCallback((pageToken?: string) => {
		const action = async () => {
			setError(null);

            // Перед дозагрузкой сохраняем позицию скролла
            const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
			if (pageToken && viewport) {
				setScrollState({ scrollHeight: viewport.scrollHeight, scrollTop: viewport.scrollTop });
			}

			const result: GetLogsResult = await getLogsAction(pageToken);

			if (result.error) {
				setError(result.error);
				if (!pageToken) {
					setLogs([]);
					setNextPageToken(null);
				}
			} else {
				setLogs(prev => pageToken ? [...prev, ...(result.logs || [])] : (result.logs || []));
				setInfo({ 
					message: result.message, 
					logFilePath: result.logFilePath,
					logFileExists: result.logFileExists
				});
				setSource(result.source || null);
				setLogSize(result.size);
				setNextPageToken(result.nextPageToken || null);
			}
		};

		if (pageToken) {
			startLoadingMore(action);
		} else {
			startFetching(action);
		}
	}, []);

	const handleRefresh = useCallback(() => {
		setLogs([]);
		setNextPageToken(null);
		fetchLogs();
	}, [fetchLogs]);

	const handleLoadMore = useCallback(() => {
		if (nextPageToken) fetchLogs(nextPageToken);
	}, [fetchLogs, nextPageToken]);

	const handleClearLogs = useCallback(() => {
		startClearing(async () => {
			const result = await clearLogsAction();
			if (result.success) {
				toast({ title: "Успех", description: result.message });
				handleRefresh();
			} else {
				toast({ title: "Ошибка", description: result.message, variant: "destructive" });
			}
		});
	}, [toast, handleRefresh]);

	useEffect(() => {
		handleRefresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const filteredLogs = useMemo(() => {
		if (!filter) return logs;
		return logs.filter(line => line.toLowerCase().includes(filter.toLowerCase()));
	}, [logs, filter]);

	const loadingSkeletons = Array.from({ length: 10 }).map((_, i) => (
		<TableRow key={i}><TableCell><Skeleton className="h-4 w-full" /></TableCell></TableRow>
	));

	const logRows = filteredLogs.map((log, index) => (
		<TableRow key={index}><TableCell><pre className="text-xs whitespace-pre-wrap break-all">{log}</pre></TableCell></TableRow>
	));

	const emptyState = (
		<TableRow><TableCell className="text-center text-muted-foreground py-8">
			{logs.length === 0 ? "Логи отсутствуют." : "Ничего не найдено по вашему фильтру."}
		</TableCell></TableRow>
	);

	const showSkeletons = isFetching && logs.length === 0;

	return (
		<div className="flex flex-col h-full gap-4">
			<Card>
				<CardHeader>
					<CardTitle>Просмотр логов</CardTitle>
					<CardDescription>
						<div className="flex items-center gap-2 flex-wrap">
							<span>Анализ и управление системными логами.</span>
							{source && <Badge variant={source === 'cloud' ? 'default' : 'outline'}>{source === 'cloud' ? '☁️ Cloud' : '📁 Local'}</Badge>}
							{logSize !== undefined && <Badge variant="secondary">📊 {formatBytes(logSize)}</Badge>}
						</div>
						{source === 'local' && info?.logFilePath && (
						<div className="text-xs text-muted-foreground mt-2">
							<span>Путь: </span><code>{info.logFilePath}</code>
							{info.logFileExists !== undefined && (
							<span className={info.logFileExists ? 'text-green-600' : 'text-amber-600'}> • {info.logFileExists ? 'найден' : 'не найден'}</span>
							)}
						</div>
						)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col sm:flex-row gap-2 items-center">
						<div className="relative w-full flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
							<Input 
								type="text" 
								placeholder="Фильтр по логам..." 
								value={filter} 
								onChange={(e) => setFilter(e.target.value)} 
								className="pl-10" 
								disabled={isAnyLoading} 
								aria-label="Поиск в логах" 
							/>
							{filter && <X className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" onClick={() => setFilter('')}/>}
						</div>
						<div className="flex gap-2">
							<Button onClick={handleRefresh} disabled={isAnyLoading} variant="outline" aria-label="Обновить логи">
								<RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
								Обновить
							</Button>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<div className='inline-block'>
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button 
														variant="destructive" 
														disabled={isAnyLoading || source === 'cloud'} 
														className={source === 'cloud' ? 'cursor-not-allowed' : ''}
													>
														<Trash2 className="mr-2 h-4 w-4" /> Очистить
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>Вы уверены?</AlertDialogTitle>
														<AlertDialogDescription>Это действие необратимо удалит все локальные записи логов.</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Отмена</AlertDialogCancel>
														<AlertDialogAction onClick={handleClearLogs} disabled={isClearing}>
															{isClearing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
															Продолжить
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</div>
									</TooltipTrigger>
									{source === 'cloud' && <TooltipContent><p>Очистка недоступна для Cloud Logging.</p></TooltipContent>}
								</Tooltip>
							</TooltipProvider>
						</div>
					</div>
				</CardContent>
			</Card>

			{error && (
				<Alert variant="destructive">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>Ошибка</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
			{info?.message && logs.length === 0 && !isFetching && (
				<Alert>
					<Info className="h-4 w-4" />
					<AlertTitle>Информация</AlertTitle>
					<AlertDescription>{info.message}</AlertDescription>
				</Alert>
			)}

			<Card className="flex-1 flex flex-col">
				<CardContent className="p-2 flex-1 h-[60vh] overflow-hidden">
					<ScrollArea className="h-full w-full" ref={scrollAreaRef}>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="sticky top-0 z-10 bg-card border-b border-border">
										Запись лога ({logs.length} всего)
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{showSkeletons ? loadingSkeletons : (logRows.length > 0 ? logRows : emptyState)}
							</TableBody>
						</Table>

						{nextPageToken && (
						<div className="flex justify-center p-4">
							<Button onClick={handleLoadMore} disabled={isLoadingMore} variant="secondary">
								{isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
								Загрузить еще
							</Button>
						</div>
						)}

						{source === 'cloud' && !nextPageToken && logs.length > 0 && (
							<div className="text-center text-sm text-muted-foreground py-4">
								— Конец истории логов —
							</div>
						)}
					</ScrollArea>
				</CardContent>
			</Card>
		</div>
	);
}
