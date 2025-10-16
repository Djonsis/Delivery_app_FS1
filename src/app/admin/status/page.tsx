
"use client";

import { useState, useEffect, useTransition } from 'react';
import { getDbStatusAction, type DbStatus, checkTablesAction, initializeDbAction } from '@/lib/actions/db.actions';
import { getStorageStatusAction, type StorageStatus } from '@/lib/actions/storage.actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle2, Clipboard, Package, Database, Table, HardHat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog"

interface TableStatus {
    name: string;
    exists: boolean;
}

export default function StatusPage() {
    const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
    const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
    const [tableStatuses, setTableStatuses] = useState<TableStatus[]>([]);

    const [isLoading, startLoading] = useTransition();
    const [isInitializing, startInitializing] = useTransition();
    const { toast } = useToast();

    const fetchStatus = () => {
        startLoading(async () => {
            const [db, storage, tables] = await Promise.all([
                getDbStatusAction(),
                getStorageStatusAction(),
                checkTablesAction()
            ]);
            setDbStatus(db);
            setStorageStatus(storage);
            setTableStatuses(tables);
        });
    };

    useEffect(() => {
        fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleInitializeDb = () => {
        startInitializing(async () => {
            const result = await initializeDbAction();
            if (result.success) {
                toast({
                    title: "Успех!",
                    description: "База данных успешно инициализирована.",
                });
                fetchStatus(); // Re-fetch status to show new tables
            } else {
                toast({
                    title: "Ошибка инициализации",
                    description: result.error,
                    variant: "destructive",
                });
            }
        });
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Скопировано!",
            description: "Текст ошибки скопирован в буфер обмена.",
        });
    }

    function StatusRow({ label, value, isSensitive = false }: { label: string; value: string | number | undefined, isSensitive?: boolean}) {
        return (
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b last:border-b-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={`font-mono font-semibold break-all ${isSensitive ? 'blur-sm hover:blur-none' : ''}`}>
                    {value ?? <span className="text-xs text-muted-foreground">Не задано</span>}
                </span>
            </div>
        )
    }

    const allTablesExist = tableStatuses.length > 0 && tableStatuses.every(t => t.exists);

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

            {!allTablesExist && dbStatus?.connected && (
                <Card className="border-destructive">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-6 w-6 text-destructive" />
                            <CardTitle className="text-destructive">Требуется инициализация базы данных</CardTitle>
                        </div>
                         <CardDescription>
                           База данных подключена, но необходимые таблицы отсутствуют. Нажмите кнопку, чтобы создать структуру таблиц.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <HardHat className="mr-2 h-4 w-4" />
                                    Инициализировать базу данных
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Это действие создаст все необходимые таблицы в вашей базе данных. 
                                    Операция безопасна для повторного выполнения и не удалит существующие данные, если таблицы уже есть.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={handleInitializeDb} disabled={isInitializing}>
                                    {isInitializing ? "Выполнение..." : "Да, создать таблицы"}
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                       
                    </CardContent>
                </Card>
            )}


            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        {isLoading && !dbStatus ? <RefreshCw className="h-6 w-6 animate-spin" /> : 
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
                                     <CardTitle className="text-base flex items-center gap-2">
                                        <Table className="h-5 w-5"/>
                                        Статус таблиц
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="divide-y">
                                    {tableStatuses.length > 0 ? tableStatuses.map(t => (
                                        <div key={t.name} className="flex items-center justify-between py-2">
                                            <span className="font-mono text-sm">{t.name}</span>
                                            {t.exists 
                                                ? <Badge variant="secondary" className="bg-green-100 text-green-800">Найдена</Badge> 
                                                : <Badge variant="destructive">Отсутствует</Badge>
                                            }
                                        </div>
                                    )) : <p className="text-sm text-muted-foreground">Не удалось проверить таблицы.</p>}
                                </CardContent>
                            </Card>
                            <Card className="bg-muted/30">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Database className="h-5 w-5"/>
                                        Параметры подключения
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="divide-y">
                                    <StatusRow label="Хост" value={dbStatus.host} />
                                    <StatusRow label="Порт" value={dbStatus.port} />
                                    <StatusRow label="База данных" value={dbStatus.database} />
                                    <StatusRow label="Пользователь" value={dbStatus.user} />
                                </CardContent>
                            </Card>
                            
                            {dbStatus.error && (
                                <div className="p-4 rounded-md bg-destructive/5 text-destructive-foreground border border-destructive/20">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="font-semibold text-destructive">Последняя ошибка:</p>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => copyToClipboard(dbStatus.error!)}
                                        >
                                            <Clipboard className="h-4 w-4"/>
                                            <span className="sr-only">Скопировать ошибку</span>
                                        </Button>
                                    </div>
                                    <pre className="text-sm whitespace-pre-wrap font-mono">{dbStatus.error}</pre>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p>Не удалось загрузить статус базы данных.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        {isLoading && !storageStatus ? <RefreshCw className="h-6 w-6 animate-spin" /> : 
                            storageStatus?.connected ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <AlertTriangle className="h-6 w-6 text-destructive" />}
                        <CardTitle className="text-lg">Хранилище объектов (GCS/S3)</CardTitle>
                        {storageStatus && (
                             storageStatus.connected ? (
                                <Badge variant="default" className="bg-green-500 hover:bg-green-600">Подключено</Badge>
                            ) : (
                                <Badge variant="destructive">Отключено</Badge>
                            )
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading && !storageStatus ? (
                        <p>Получение данных...</p>
                    ) : storageStatus ? (
                        <div className="space-y-4">
                            <Card className="bg-muted/30">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Package className="h-5 w-5"/>
                                        Параметры
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="divide-y">
                                    <StatusRow label="Бакет (Bucket)" value={storageStatus.bucketName} />
                                    <StatusRow label="Эндпоинт (Endpoint)" value={storageStatus.endpoint} />
                                    <StatusRow label="Регион (Region)" value={storageStatus.region} />
                                    <StatusRow label="Ключ доступа (Access Key)" value={storageStatus.accessKeyId} isSensitive={true} />
                                </CardContent>
                            </Card>
                            
                            {storageStatus.error && (
                                <div className="p-4 rounded-md bg-destructive/5 text-destructive-foreground border border-destructive/20">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="font-semibold text-destructive">Последняя ошибка:</p>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => copyToClipboard(storageStatus.error!)}
                                        >
                                            <Clipboard className="h-4 w-4"/>
                                            <span className="sr-only">Скопировать ошибку</span>
                                        </Button>
                                    </div>
                                    <pre className="text-sm whitespace-pre-wrap font-mono">{storageStatus.error}</pre>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p>Не удалось загрузить статус хранилища.</p>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}

    