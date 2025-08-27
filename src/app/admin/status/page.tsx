
"use client";

import { useState, useEffect, useTransition } from 'react';
import { getDbStatusAction, type DbStatus } from '@/lib/actions/db.actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
                    <CardTitle className="text-lg">База данных PostgreSQL</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading && !dbStatus ? (
                        <p>Получение данных...</p>
                    ) : dbStatus ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Статус</span>
                                {dbStatus.connected ? (
                                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">Подключено</Badge>
                                ) : (
                                    <Badge variant="destructive">Отключено</Badge>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Всего соединений в пуле</span>
                                <span className="font-mono font-semibold">{dbStatus.totalCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Свободные соединения</span>
                                <span className="font-mono font-semibold">{dbStatus.idleCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Запросов в очереди</span>
                                <span className="font-mono font-semibold">{dbStatus.waitingCount}</span>
                            </div>
                            {dbStatus.error && (
                                <div className="p-3 rounded-md bg-destructive/10 text-destructive-foreground border border-destructive/20">
                                    <p className="font-semibold">Последняя ошибка:</p>
                                    <p className="text-sm">{dbStatus.error}</p>
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

