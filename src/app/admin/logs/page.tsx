"use client";

import { useState, useEffect, useTransition } from 'react';
import { getLogsAction, clearLogsAction } from '@/lib/actions/log.actions';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Trash2, Search, X } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';


const AUTO_CLEAR_LIMIT_BYTES = 5 * 1024 * 1024; // 5 MB

export default function LogsPage() {
  const [logs, setLogs] = useState('');
  const [logSize, setLogSize] = useState(0);
  const [filter, setFilter] = useState('');
  const [isAutoClearEnabled, setIsAutoClearEnabled] = useState(false);

  const [isLoading, startLoading] = useTransition();
  const [isClearing, startClearing] = useTransition();
  const { toast } = useToast();

  const fetchLogs = () => {
    startLoading(async () => {
      const { logs, size } = await getLogsAction();
      setLogs(logs);
      setLogSize(size);

      if (isAutoClearEnabled && size > AUTO_CLEAR_LIMIT_BYTES) {
        toast({
          title: "Автоматическая очистка",
          description: `Размер логов превысил ${AUTO_CLEAR_LIMIT_BYTES / 1024 / 1024}MB. Запускаю очистку.`,
        });
        handleClearLogs();
      }
    });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = () => {
    startClearing(async () => {
      const result = await clearLogsAction();
      if (result.success) {
        toast({
          title: "Успех",
          description: result.message,
        });
        fetchLogs(); // Refresh logs after clearing
      } else {
        toast({
          title: "Ошибка",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  const filteredLogs = logs
    .split('\n')
    .filter(line => line.toLowerCase().includes(filter.toLowerCase()))
    .join('\n');

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Просмотр логов</CardTitle>
          <CardDescription>
            Здесь отображается содержимое файла `debug.log`. Текущий размер файла: <strong>{formatBytes(logSize)}</strong>
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
                    />
                    {filter && <X className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" onClick={() => setFilter('')}/>}
                </div>
                <div className="flex items-center space-x-2">
                    <Switch 
                        id="auto-clear"
                        checked={isAutoClearEnabled}
                        onCheckedChange={setIsAutoClearEnabled}
                    />
                    <Label htmlFor="auto-clear" className="text-sm">Авто-очистка &gt; 5MB</Label>
                </div>
                <div className="flex gap-2">
                     <Button onClick={fetchLogs} disabled={isLoading} variant="outline">
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Обновить
                    </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isClearing}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Очистить
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Это действие необратимо удалит все записи из файла логов.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearLogs}>Продолжить</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </CardContent>
      </Card>
      
      <Card className="flex-1 flex flex-col">
        <CardContent className="p-2 flex-1">
            <ScrollArea className="h-full">
            <pre className="text-xs p-4 whitespace-pre-wrap break-all">
                {isLoading ? "Загрузка логов..." : (filteredLogs || "Файл логов пуст или ничего не найдено.")}
            </pre>
            </ScrollArea>
        </CardContent>
      </Card>

    </div>
  );
}
