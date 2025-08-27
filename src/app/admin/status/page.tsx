
"use client";

import { useState, useEffect, useTransition } from 'react';
import { getDbStatusAction, type DbStatus } from '@/lib/actions/db.actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function StatusPage() {
    const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
    const [isLoading, startLoading] = useTransition();

    const fetchStatus = () => {
        startLoading(async () => {
            const status = await getDbStatusAction();
            setDbStatus(status);
        });
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    function StatusRow({ label, value, isSensitive = false }: { label: string; value: string | number | undefined, isSensitive?: boolean}) {
        return (
             <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className={`font-mono font-semibold ${isSensitive ? 'blur-sm hover:blur-none' : ''}`}>
                    {value ?? <span className="text-xs text-muted-foreground">Не задано</span>}
                </span>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Статус системы</CardTitle>
                            <CardDescription>
                                Диагностическая информация о состоянии ключевых сервисов.
                            </CardDescription>
                        </div>
                        <Button onClick={fetchStatus} disabled={isLoading} variant="outline" size="sm">
                            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Обновить
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        {isLoading ? <RefreshCw className="h-6 w-6 animate-spin" /> : 
                            dbStatus?.connected ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <AlertTriangle className="h-6 w-6 text-destructive" />}
                        <CardTitle className="text-lg">База данных PostgreSQL</CardTitle>
                        {dbStatus && (
                             dbStatus.connected ? (
                                <Badge variant="default" className="bg-green-500 hover:bg-green-600">Подключено</Badge>
                            ) : (
                                <Badge variant="destructive">Отключено</Badge>
                            )
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading && !dbStatus ? (
                        <p>Получение данных...</p>
                    ) : dbStatus ? (
                        <div className="space-y-4">
                            <Card className="bg-muted/30">
                                <CardHeader>
                                    <CardTitle className="text-base">Параметры подключения</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <StatusRow label="Хост" value={dbStatus.host} />
                                    <StatusRow label="Порт" value={dbStatus.port} />
                                    <StatusRow label="База данных" value={dbStatus.database} />
                                    <StatusRow label="Пользователь" value={dbStatus.user} />
                                </CardContent>
                            </Card>
                             <Card className="bg-muted/30">
                                <CardHeader>
                                    <CardTitle className="text-base">Статистика пула</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <StatusRow label="Всего соединений в пуле" value={dbStatus.totalCount} />
                                    <StatusRow label="Свободные соединения" value={dbStatus.idleCount} />
                                    <StatusRow label="Запросов в очереди" value={dbStatus.waitingCount} />
                                </CardContent>
                            </Card>
                            
                            {dbStatus.error && (
                                <div className="p-3 rounded-md bg-destructive/10 text-destructive-foreground border border-destructive/20">
                                    <p className="font-semibold">Последняя ошибка:</p>
                                    <pre className="text-sm whitespace-pre-wrap font-mono mt-2">{dbStatus.error}</pre>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p>Не удалось загрузить статус базы данных.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
