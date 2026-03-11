import { useState, useRef, useEffect, useMemo } from 'react';
import { App, theme } from 'antd';
import '@tauri-apps/api/core';
import {
  ConfigProvider,
  Layout,
  Input,
  InputNumber,
  Switch,
  Button,
  Card,
  Typography,
  Space,
  Tag,
  Empty,
  Spin,
  Modal,
  Collapse,
  Radio,
  Tabs,
  List,
  Image,
  Select,
  Row,
  Col,
  Divider,
  Alert,
  Steps,
  Checkbox,
  Dropdown,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  UnorderedListOutlined,
  AreaChartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  AppstoreOutlined,
  RobotOutlined,
  UploadOutlined,
  DeleteOutlined,
  SettingOutlined,
  DownloadOutlined,
  QuestionCircleOutlined,
  PictureOutlined,
  FileTextOutlined,
  EyeOutlined,
  LinkOutlined,
  SunOutlined,
  MoonOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import type {
  ParsedPrompt,
  CharacterBinding,
  ImageGenerationParams,
  ImageGenerationResult,
  APIConfig,
  BatchSplitResult,
} from './types';
import * as api from './api';
import type { ReferenceImageQuery } from './api';
import { useTheme } from './theme';
import { SlideUp, FadeIn, ScaleIn } from './theme/animations';
import { Toolbar } from './components/Toolbar';
import { HistoryList } from './components/history';
import { ReferenceLibrary } from './components/library';
import PromptTemplateModal from './components/templates';
import { StatsPage } from './components/stats';
import dayjs from 'dayjs';
import './App.css';

const { Header, Content, Sider } = Layout;
const { TextArea } = Input;
const { Title, Text } = Typography;

const getThemeConfig = (isDark: boolean) => ({
  token: {
    colorPrimary: '#6366f1',
    borderRadius: 12,
    fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif",
    colorBgContainer: isDark ? '#1e293b' : '#ffffff',
    colorBgElevated: isDark ? '#1e293b' : '#ffffff',
    colorBgLayout: isDark ? '#0f172a' : '#f8fafc',
    colorText: isDark ? '#f1f5f9' : '#1e293b',
    colorTextSecondary: isDark ? '#94a3b8' : '#64748b',
    colorBorder: isDark ? '#334155' : '#e2e8f0',
  },
  algorithm: isDark ? theme.darkAlgorithm : undefined,
});

const segmentTags: Record<string, { color: string; icon: any }> = {
  scene: { color: '#10b981', icon: <AppstoreOutlined /> },
  action: { color: '#f59e0b', icon: <PlayCircleOutlined /> },
  character: { color: '#6366f1', icon: <UserOutlined /> },
  background: { color: '#8b5cf6', icon: <AppstoreOutlined /> },
  time: { color: '#ec4899', icon: <AppstoreOutlined /> },
  weather: { color: '#06b6d4', icon: <AppstoreOutlined /> },
  style: { color: '#f97316', icon: <AppstoreOutlined /> },
  other: { color: '#64748b', icon: <RobotOutlined /> },
};

type QueueTaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

interface GenerationQueueTask {
  id: string;
  name: string;
  mode: 'single' | 'batch';
  status: QueueTaskStatus;
  createdAt: string;
  updatedAt: string;
  total: number;
  current: number;
  elapsedMs: number;
  runStartedAt?: string;
  error?: string;
  payload: {
    segments: Array<{ index: number; content: string; characters: Array<{ name: string }> }>;
    model: 'seedream' | 'banana_pro';
    imageQuality: 'standard' | 'high' | 'ultra';
    watermark: string;
    bananaResolution: string;
    seedreamSize: string;
    imageSize: { width: number; height: number };
    concurrency: number;
    batchMode: boolean;
    failStrategy: 'continue' | 'stop';
    testMode: boolean;
    mockDelayMs: number;
    mockFailAt: number | null;
    characterBindings: Record<string, CharacterBinding>;
    parsedCharacters: string[];
    sourceHistoryId?: string;
  };
  progress: {
    total: number;
    current: number;
    sceneResults: Array<{ index: number; status: string; result?: ImageGenerationResult }>;
  };
}

const QUEUE_STORAGE_KEY = 'xuanchen_generation_queue_v1';

function MainApp() {
  const { message } = App.useApp();
  const { resolvedTheme, setMode } = useTheme();
  const [currentPage, setCurrentPage] = useState('workspace');
  const [prompt, setPrompt] = useState('');
  const [promptHistories, setPromptHistories] = useState<api.PromptHistoryItem[]>([]);
  const [promptHistorySearch, setPromptHistorySearch] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedPrompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [bindingModalVisible, setBindingModalVisible] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [imageType, setImageType] = useState<'人物' | '人脸' | '全身' | '场景'>('人物');
  const [bindingLoading, setBindingLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('upload');
  const [referenceImageLibrary, setReferenceImageLibrary] = useState<CharacterBinding[]>([]);
  const [charactersToBind, setCharactersToBind] = useState<string[]>([]);
  const dragCounter = useRef(0);

  const [selectedModel, setSelectedModel] = useState<'seedream' | 'banana_pro'>('seedream');
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({
    width: 1,
    height: 1,
  });
  const [bananaResolution, setBananaResolution] = useState<string>('1K');
  const [imageQuality, setImageQuality] = useState<'standard' | 'high' | 'ultra'>('standard');
  const [seedreamSize, setSeedreamSize] = useState<string>('1024x1024');
  const [sequentialImageGeneration, setSequentialImageGeneration] = useState<'auto' | 'disabled'>(
    'disabled'
  );
  const [responseFormat, setResponseFormat] = useState<'url' | 'b64_json'>('url');
  const [watermark, setWatermark] = useState<string>('false');
  const [generationResult, setGenerationResult] = useState<ImageGenerationResult | null>(null);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [referenceModalVisible, setReferenceModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [referenceImages, setReferenceImages] = useState<CharacterBinding[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [referenceFilterType, setReferenceFilterType] = useState<string>('');
  const [referenceSearch, setReferenceSearch] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [addTagModalVisible, setAddTagModalVisible] = useState(false);
  const [addTagCharacter, setAddTagCharacter] = useState('');
  const [characterBindings, setCharacterBindings] = useState<Record<string, CharacterBinding>>({});
  const [apiConfig, setApiConfig] = useState<APIConfig>({
    seedream: { baseUrl: '', apiKey: '' },
    bananaPro: { baseUrl: '', apiKey: '' },
  });
  const [testingApi, setTestingApi] = useState<'seedream' | 'banana_pro' | null>(null);

  const [batchMode, setBatchMode] = useState(false);
  const [batchDelimiter, setBatchDelimiter] = useState('|');
  const [batchAutoDetect, setBatchAutoDetect] = useState(true);
  const [batchSplitResult, setBatchSplitResult] = useState<BatchSplitResult | null>(null);
  const [batchSplitLoading, setBatchSplitLoading] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<any>(null);
  const [queueModalVisible, setQueueModalVisible] = useState(false);
  const [generationQueue, setGenerationQueue] = useState<GenerationQueueTask[]>([]);
  const [concurrency, setConcurrency] = useState(2);
  const [batchGenModalVisible, setBatchGenModalVisible] = useState(false);
  const [batchGenerationMode, setBatchGenerationMode] = useState<'sequential' | 'parallel'>(
    'parallel'
  );
  const [failStrategy, setFailStrategy] = useState<'continue' | 'stop'>('continue');
  const [queueTestMode, setQueueTestMode] = useState(false);
  const [queueMockDelayMs, setQueueMockDelayMs] = useState(1200);
  const [queueMockFailAt, setQueueMockFailAt] = useState<number | null>(null);
  const queueCancelRef = useRef<Record<string, boolean>>({});
  const queueRunningRef = useRef(false);
  const queueStateRef = useRef<GenerationQueueTask[]>([]);
  const [nowTime, setNowTime] = useState(() => dayjs());
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    todayTotal: 0,
    todaySuccess: 0,
    todayFailed: 0,
    latestFailedPrompt: '',
    latestFailedAt: '',
  });

  useEffect(() => {
    console.log('App loaded, checking Tauri...');
    loadApiConfig();
    loadGenerationConfig();
    loadPromptHistories();
    loadDashboardStats();
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GenerationQueueTask[];
        const restored = parsed.map(task => {
          const normalizedTask: GenerationQueueTask = {
            ...task,
            elapsedMs: task.elapsedMs ?? 0,
            runStartedAt: task.runStartedAt,
          };
          if (task.status === 'running') {
            return {
              ...normalizedTask,
              status: 'paused' as QueueTaskStatus,
              runStartedAt: undefined,
              error: '应用重启后任务已暂停，请手动继续',
            };
          }
          return normalizedTask;
        });
        setGenerationQueue(restored);
      }
    } catch (error) {
      console.error('恢复队列失败:', error);
    }
  }, []);

  useEffect(() => {
    queueStateRef.current = generationQueue;
    try {
      const queueToSave = generationQueue.map(task => ({
        ...task,
        progress: {
          ...task.progress,
          sceneResults: task.progress.sceneResults.map(sr => ({
            index: sr.index,
            status: sr.status,
          })),
        },
      }));
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queueToSave));
    } catch (error) {
      console.error('保存队列失败:', error);
      message.warning('队列数据保存失败，刷新页面后任务可能丢失');
    }
  }, [generationQueue]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardStats = async () => {
    setDashboardLoading(true);
    try {
      const startDate = dayjs().startOf('day').toISOString();
      const endDate = dayjs().endOf('day').toISOString();
      const allItems: any[] = [];
      let page = 0;
      const pageSize = 200;

      while (true) {
        const result = await api.getHistory(page, pageSize, { startDate, endDate });
        allItems.push(...result.items);
        if (allItems.length >= result.total || result.items.length === 0) break;
        page += 1;
      }

      const todayTotal = allItems.length;
      const todaySuccess = allItems.filter(item => item.status === 'completed').length;
      const todayFailed = allItems.filter(item => item.status === 'failed').length;
      const latestFailed = allItems.find(item => item.status === 'failed');

      setDashboardStats({
        todayTotal,
        todaySuccess,
        todayFailed,
        latestFailedPrompt: latestFailed?.prompt || '',
        latestFailedAt: latestFailed?.created_at || '',
      });
    } catch (error) {
      console.error('加载首页概览失败:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const loadPromptHistories = async () => {
    try {
      const items = await api.getPromptHistory(20);
      setPromptHistories(items);
    } catch (error) {
      console.error('加载提示词历史失败:', error);
    }
  };

  const savePromptToHistory = async (text: string) => {
    const normalized = text.trim();
    if (!normalized) return;
    try {
      await api.addPromptHistory(normalized);
      await loadPromptHistories();
    } catch (error) {
      console.error('保存提示词历史失败:', error);
    }
  };

  const toFriendlyGenerateError = (raw: unknown) => {
    const text = String(raw || '');
    if (
      text.includes('unexpected end of JSON input') ||
      text.includes('400 Bad Request') ||
      text.includes('413')
    ) {
      return '请求体被网关拒绝或截断，请减少参考图数量/大小后重试。系统已尝试自动降级。';
    }
    if (text.includes('API Key') || text.includes('api key')) {
      return 'API Key 无效或未配置，请先在 API 配置中检查。';
    }
    return text;
  };

  const filteredPromptHistories = useMemo(() => {
    const keyword = promptHistorySearch.trim().toLowerCase();
    if (!keyword) return promptHistories;
    return promptHistories.filter(item => item.prompt.toLowerCase().includes(keyword));
  }, [promptHistories, promptHistorySearch]);

  const handleDeletePromptHistory = async (id: string) => {
    try {
      await api.deletePromptHistory(id);
      await loadPromptHistories();
      message.success('已删除该条提示词历史');
    } catch (error) {
      message.error(`删除失败: ${String(error)}`);
    }
  };

  const handleClearPromptHistory = async () => {
    try {
      await api.clearPromptHistory();
      setPromptHistorySearch('');
      await loadPromptHistories();
      message.success('提示词历史已清空');
    } catch (error) {
      message.error(`清空失败: ${String(error)}`);
    }
  };

  const loadApiConfig = async () => {
    try {
      const config = await api.loadApiConfig();
      setApiConfig(config);
    } catch (error) {
      console.error('加载API配置失败, 使用默认配置:', error);
      setApiConfig({
        seedream: { baseUrl: 'https://eggfans.com', apiKey: '' },
        bananaPro: { baseUrl: 'https://api.zhongzhuan.chat', apiKey: '' },
      });
    }
  };

  const loadGenerationConfig = async () => {
    try {
      const config = await api.loadGenerationConfig();
      if (config.model === 'seedream' || config.model === 'banana_pro') {
        setSelectedModel(config.model);
      }

      const normalizeRatio = (w: number | undefined, h: number | undefined) => {
        if (!w || !h || w <= 0 || h <= 0) return { width: 1, height: 1 };

        // Simple 1:1 check
        if (w === h) return { width: 1, height: 1 };

        // Iterative GCD (Safe from recursion limits)
        let a = w,
          b = h;
        while (b) {
          a %= b;
          [a, b] = [b, a];
        }
        const common = a;

        const nw = w / common;
        const nh = h / common;

        // Only return normalized if it matches our standard UI options
        const standardRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
        if (standardRatios.includes(`${nw}:${nh}`)) {
          return { width: nw, height: nh };
        }

        // Fallback to default 1:1 if it's some weird non-standard large number
        // or just keep it as is if it's small enough (though unlikely with current UI)
        return nw > 20 || nh > 20 ? { width: 1, height: 1 } : { width: nw, height: nh };
      };

      if (config.model === 'banana_pro') {
        setImageSize(normalizeRatio(config.width, config.height));
        if (config.size) setBananaResolution(config.size);
      } else {
        setImageSize(normalizeRatio(config.width, config.height));
        if (config.size) setSeedreamSize(config.size);
      }

      setImageQuality(config.quality as 'standard' | 'high' | 'ultra');
      if (config.sequential_image_generation)
        setSequentialImageGeneration(config.sequential_image_generation as 'auto' | 'disabled');
      if (config.response_format) setResponseFormat(config.response_format as 'url' | 'b64_json');
      if (config.watermark !== undefined) setWatermark(config.watermark.toString());
    } catch (error) {
      console.log('使用默认生成参数配置');
    }
  };

  const handleParse = async () => {
    if (!prompt.trim()) {
      message.warning('请输入提示词');
      return;
    }

    void savePromptToHistory(prompt);

    setLoading(true);
    try {
      const result = await api.parsePrompt(prompt);
      setParsedResult(result);

      const bindings = await api.getBindingsForPrompt(result.characters.map(c => c.name));

      const bindingMap: Record<string, CharacterBinding> = {};
      bindings.forEach(b => {
        if (b.referenceImagePath && b.referenceImagePath.trim() !== '') {
          bindingMap[b.characterName] = b;
        }
      });
      setCharacterBindings(bindingMap);

      const updatedCharacters = result.characters.map(c => ({
        ...c,
        bound: !!bindingMap[c.name],
      }));
      setParsedResult({ ...result, characters: updatedCharacters });

      message.success('解析成功');
    } catch (error) {
      message.error(`解析失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSplit = async () => {
    if (!prompt.trim()) {
      message.warning('请输入提示词');
      return;
    }

    void savePromptToHistory(prompt);

    console.log('[BatchSplit] params:', { prompt, batchDelimiter, batchAutoDetect });
    setBatchSplitLoading(true);
    try {
      const result = await api.batchSplitPrompt(prompt, batchDelimiter, batchAutoDetect);
      setBatchSplitResult(result);
      message.success(`拆分成功，共${result.total}个场景`);
    } catch (error) {
      console.error('[BatchSplit] error:', error);
      message.error(`拆分失败: ${error}`);
    } finally {
      setBatchSplitLoading(false);
    }
  };

  const updateQueueTask = (
    taskId: string,
    updater: (task: GenerationQueueTask) => GenerationQueueTask
  ) => {
    setGenerationQueue(prev => prev.map(task => (task.id === taskId ? updater(task) : task)));
  };

  const buildCurrentGenerationTask = (): GenerationQueueTask | null => {
    let segments = batchMode ? batchSplitResult?.segments : parsedResult?.segments;
    if (!segments || segments.length === 0) return null;

    if (!batchMode && parsedResult) {
      segments = parsedResult.segments.map((seg, idx) => ({
        index: idx,
        content: seg.content,
        characters: parsedResult.characters,
      }));
    }

    const normalizedSegments = (segments as any[]).map((seg: any, idx: number) => ({
      index: seg.index ?? idx,
      content: seg.content,
      characters: (seg.characters || []).map((char: any) => ({ name: char.name })),
    }));

    return {
      id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: `${batchMode ? '批量' : '单图'}生成任务 ${dayjs().format('HH:mm:ss')}`,
      mode: batchMode ? 'batch' : 'single',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      total: normalizedSegments.length,
      current: 0,
      elapsedMs: 0,
      payload: {
        segments: normalizedSegments,
        model: selectedModel,
        imageQuality,
        watermark,
        bananaResolution,
        seedreamSize,
        imageSize,
        concurrency: batchGenerationMode === 'sequential' ? 1 : concurrency,
        batchMode,
        failStrategy,
        testMode: queueTestMode,
        mockDelayMs: queueMockDelayMs,
        mockFailAt: queueMockFailAt,
        characterBindings: { ...characterBindings },
        parsedCharacters: parsedResult?.characters?.map(c => c.name) || [],
      },
      progress: {
        total: normalizedSegments.length,
        current: 0,
        sceneResults: normalizedSegments.map(seg => ({
          index: seg.index,
          status: 'pending',
        })),
      },
    };
  };

  const enqueueGenerationTask = () => {
    const task = buildCurrentGenerationTask();
    if (!task) {
      message.warning('没有可生成的分段，请先解析或拆分');
      return;
    }
    if (task.total <= 1) {
      message.info('当前仅 1 个分段，任务会很快完成，暂停效果不明显。');
    }
    setGenerationQueue(prev => [...prev, task]);
    message.success('已加入任务队列');
  };

  const handleCancelQueueTask = (taskId: string) => {
    queueCancelRef.current[taskId] = true;
    updateQueueTask(taskId, task => ({
      ...task,
      status: task.status === 'running' ? task.status : 'cancelled',
      elapsedMs:
        task.status === 'running' && task.runStartedAt
          ? task.elapsedMs + Math.max(0, Date.now() - new Date(task.runStartedAt).getTime())
          : task.elapsedMs,
      runStartedAt: task.status === 'running' ? undefined : task.runStartedAt,
      updatedAt: new Date().toISOString(),
    }));
    message.info('已取消该任务');
  };

  const handlePauseQueueTask = (taskId: string) => {
    updateQueueTask(taskId, task => ({
      ...task,
      status: task.status === 'running' || task.status === 'pending' ? 'paused' : task.status,
      elapsedMs:
        task.status === 'running' && task.runStartedAt
          ? task.elapsedMs + Math.max(0, Date.now() - new Date(task.runStartedAt).getTime())
          : task.elapsedMs,
      runStartedAt: undefined,
      updatedAt: new Date().toISOString(),
    }));
    message.info('任务已暂停');
  };

  const handleResumeQueueTask = (taskId: string) => {
    updateQueueTask(taskId, task => ({
      ...task,
      status: task.status === 'paused' ? 'pending' : task.status,
      updatedAt: new Date().toISOString(),
    }));
    message.success('任务已继续');
  };

  const handleRetryQueueTask = (taskId: string) => {
    queueCancelRef.current[taskId] = false;
    updateQueueTask(taskId, task => ({
      ...task,
      status: 'pending',
      error: undefined,
      current: 0,
      elapsedMs: 0,
      runStartedAt: undefined,
      updatedAt: new Date().toISOString(),
      progress: {
        total: task.total,
        current: 0,
        sceneResults: task.payload.segments.map(seg => ({ index: seg.index, status: 'pending' })),
      },
    }));
    message.success('任务已重新加入队列');
  };

  const handleClearFinishedQueue = () => {
    setGenerationQueue(prev =>
      prev.filter(task => !['completed', 'failed', 'cancelled'].includes(task.status))
    );
    message.success('已清理已结束任务');
  };

  const executeQueueTask = async (task: GenerationQueueTask) => {
    queueRunningRef.current = true;
    queueCancelRef.current[task.id] = false;
    setBatchGenerating(true);
    setBatchProgress(task.progress);
    updateQueueTask(task.id, prev => ({
      ...prev,
      status: 'running',
      runStartedAt: prev.runStartedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: undefined,
    }));

    let width: number;
    let height: number;
    if (task.payload.model === 'seedream') {
      const [w, h] = task.payload.seedreamSize.split('x').map(Number);
      width = w;
      height = h;
    } else {
      const baseResolution =
        task.payload.bananaResolution === '4K'
          ? 4096
          : task.payload.bananaResolution === '2K'
            ? 2048
            : 1024;
      const ratio = task.payload.imageSize.width / task.payload.imageSize.height;
      if (ratio >= 1) {
        width = baseResolution;
        height = Math.round(baseResolution / ratio);
      } else {
        height = baseResolution;
        width = Math.round(baseResolution * ratio);
      }
    }

    const runTask = async (
      seg: { index: number; content: string; characters: Array<{ name: string }> },
      idx: number
    ) => {
      if (queueCancelRef.current[task.id]) return;

      const latest = queueStateRef.current.find(t => t.id === task.id);
      if (latest?.status === 'paused') return;

      updateQueueTask(task.id, prev => {
        const sceneResults = [...prev.progress.sceneResults];
        sceneResults[idx] = { ...sceneResults[idx], status: 'generating' };
        const updated = {
          ...prev,
          progress: { ...prev.progress, sceneResults },
          updatedAt: new Date().toISOString(),
        };
        setBatchProgress(updated.progress);
        return updated;
      });

      try {
        const params: ImageGenerationParams = {
          model: task.payload.model,
          prompt: seg.content,
          characterBindings: seg.characters.map(char => {
            const b = task.payload.characterBindings[char.name];
            return {
              character_name: char.name,
              reference_image_path: b?.referenceImagePath,
              image_type: b?.imageType || '人物',
            };
          }),
          width,
          height,
          count: 1,
          quality: task.payload.imageQuality,
          watermark:
            task.payload.model === 'seedream' ? task.payload.watermark === 'true' : undefined,
        };

        let result: ImageGenerationResult;
        if (task.payload.testMode) {
          await new Promise(resolve =>
            setTimeout(resolve, Math.max(200, task.payload.mockDelayMs))
          );
          if (queueCancelRef.current[task.id]) return;
          const latest = queueStateRef.current.find(t => t.id === task.id);
          if (latest?.status === 'paused') return;
          if (task.payload.mockFailAt && idx + 1 === task.payload.mockFailAt) {
            throw new Error(`测试模式：第 ${task.payload.mockFailAt} 条模拟失败`);
          }
          result = {
            success: true,
            images: [],
            notice: `测试模式：已模拟完成第 ${idx + 1} 条`,
          };
        } else {
          result = await api.generateImage(params);
        }

        if (task.mode === 'single') {
          setGenerationResult(result);
          if (result.notice) message.warning(result.notice);
          if (!result.success && result.error) {
            message.error(`生成失败: ${toFriendlyGenerateError(result.error)}`);
          }
        }

        if (!task.payload.testMode) {
          try {
            const { addHistory } = await import('./api');
            await addHistory({
              id: `gen_${Date.now()}`,
              prompt: params.prompt,
              model: params.model,
              params: params as any,
              images: result.images || [],
              characters: task.payload.parsedCharacters,
              status: result.success ? 'completed' : 'failed',
              source_history_id: task.payload.sourceHistoryId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            void loadDashboardStats();
          } catch (e) {
            console.error('[保存历史记录失败]:', e);
          }
        }

        updateQueueTask(task.id, prev => {
          const sceneResults = [...prev.progress.sceneResults];
          sceneResults[idx] = {
            ...sceneResults[idx],
            status: result.success ? 'completed' : 'failed',
            result,
          };
          const nextProgress = {
            ...prev.progress,
            current: prev.progress.current + 1,
            sceneResults,
          };
          const updated = {
            ...prev,
            current: nextProgress.current,
            progress: nextProgress,
            updatedAt: new Date().toISOString(),
          };
          setBatchProgress(nextProgress);
          return updated;
        });
      } catch (err) {
        const friendlyError = toFriendlyGenerateError(err);
        if (task.mode === 'single') {
          setGenerationResult({
            success: false,
            images: [],
            error: friendlyError,
          });
          message.error(`生成失败: ${friendlyError}`);
        }
        updateQueueTask(task.id, prev => {
          const sceneResults = [...prev.progress.sceneResults];
          sceneResults[idx] = {
            ...sceneResults[idx],
            status: 'failed',
            result: { success: false, images: [], error: friendlyError },
          };
          const nextProgress = {
            ...prev.progress,
            current: prev.progress.current + 1,
            sceneResults,
          };
          const updated = {
            ...prev,
            current: nextProgress.current,
            progress: nextProgress,
            error: friendlyError,
            updatedAt: new Date().toISOString(),
          };
          setBatchProgress(nextProgress);
          return updated;
        });
        if (task.payload.failStrategy === 'stop') {
          queueCancelRef.current[task.id] = true;
        }
      }
    };

    const segments = task.payload.segments;
    let completedCount = task.progress.current;

    for (let i = task.progress.current; i < segments.length; i += 1) {
      if (queueCancelRef.current[task.id]) break;
      const latest = queueStateRef.current.find(t => t.id === task.id);
      if (latest?.status === 'paused') break;
      await runTask(segments[i], i);
      completedCount += 1;
    }

    const latestAfter = queueStateRef.current.find(t => t.id === task.id);
    const cancelled = queueCancelRef.current[task.id];
    const paused = latestAfter?.status === 'paused';
    const total = task.total;
    const allDone = completedCount >= total;

    updateQueueTask(task.id, prev => ({
      ...prev,
      status: cancelled ? 'cancelled' : paused ? 'paused' : allDone ? 'completed' : 'failed',
      elapsedMs: prev.runStartedAt
        ? prev.elapsedMs + Math.max(0, Date.now() - new Date(prev.runStartedAt).getTime())
        : prev.elapsedMs,
      runStartedAt: undefined,
      updatedAt: new Date().toISOString(),
    }));

    if (!cancelled && !paused && allDone) {
      message.success(`任务完成：${task.name}`);
    }

    setBatchGenerating(false);
    queueRunningRef.current = false;
  };

  useEffect(() => {
    if (queueRunningRef.current) return;
    const next = generationQueue.find(task => task.status === 'pending');
    if (!next) return;
    void executeQueueTask(next);
  }, [generationQueue]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        const result = event.target?.result as string;
        setUploadedImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = event => {
          const result = event.target?.result as string;
          setUploadedImage(result);
        };
        reader.readAsDataURL(file);
      } else {
        message.warning('请上传图片文件');
      }
    }
  };

  const openBindingModal = async (characterName: string | string[]) => {
    const chars = Array.isArray(characterName) ? characterName : [characterName];
    setSelectedCharacter(chars[0]);
    setCharactersToBind(chars);
    setUploadedImage('');
    setActiveTab('upload');
    setBindingModalVisible(true);

    // 暂时跳过API调用
    setReferenceImageLibrary([]);
  };

  const handleSelectFromLibrary = (binding: CharacterBinding) => {
    const path = binding.referenceImagePath?.replace(/^file:\/\//, '') || '';
    setUploadedImage(path);
    setImageType(binding.imageType as '人物' | '场景');
    message.success(`已选择角色 @${binding.characterName} 的参考图`);
  };

  const handleBindSubmit = async () => {
    if (charactersToBind.length === 0) {
      message.warning('请选择要绑定的角色');
      return;
    }

    if (!uploadedImage) {
      message.warning('请上传参考图');
      return;
    }

    setBindingLoading(true);
    try {
      for (const charName of charactersToBind) {
        let binding;
        if (uploadedImage.startsWith('data:')) {
          const base64Data = uploadedImage.split(',')[1];
          binding = await api.saveReferenceImage(charName, base64Data, imageType);
        } else {
          binding = await api.bindCharacterReference(charName, uploadedImage, imageType);
        }

        setCharacterBindings(prev => ({
          ...prev,
          [charName]: {
            characterName: binding.characterName,
            referenceImagePath: binding.referenceImagePath,
            imageType: binding.imageType,
            createdAt: binding.createdAt,
            bound: true,
          },
        }));

        if (parsedResult) {
          const updatedCharacters = parsedResult.characters.map(c =>
            c.name === charName ? { ...c, bound: true } : c
          );
          setParsedResult({ ...parsedResult, characters: updatedCharacters });
        }
      }

      message.success(`绑定成功，共绑定${charactersToBind.length}个角色`);
      setBindingModalVisible(false);
    } catch (error) {
      message.error(`绑定失败: ${error}`);
    } finally {
      setBindingLoading(false);
    }
  };

  const handleUnbind = async (characterName: string) => {
    // 暂时跳过API调用
    setCharacterBindings(prev => {
      const newBindings = { ...prev };
      delete newBindings[characterName];
      return newBindings;
    });

    if (parsedResult) {
      const updatedCharacters = parsedResult.characters.map(c =>
        c.name === characterName ? { ...c, bound: false } : c
      );
      setParsedResult({ ...parsedResult, characters: updatedCharacters });
    }

    message.success(`角色 @${characterName} 已解绑`);
  };

  const handleSaveConfig = async () => {
    try {
      await api.saveApiConfig(apiConfig);
      message.success('API配置保存成功');
      setConfigModalVisible(false);
    } catch (error) {
      message.error(`保存失败: ${error}`);
    }
  };

  const handleTestApi = async (model: 'seedream' | 'banana_pro') => {
    setTestingApi(model);
    try {
      const config = model === 'banana_pro' ? apiConfig.bananaPro : apiConfig.seedream;
      await api.testApiConnection(model, config.baseUrl, config.apiKey);
      message.success(`${model === 'seedream' ? 'Seeddream' : 'Banana 2'} API连接成功`);
    } catch (error) {
      message.error(`连接失败: ${error}`);
    } finally {
      setTestingApi(null);
    }
  };

  const loadReferenceImages = async () => {
    setReferenceLoading(true);
    try {
      const query: ReferenceImageQuery = {};
      if (referenceFilterType) {
        query.image_type = referenceFilterType;
      }
      if (referenceSearch) {
        query.search = referenceSearch;
      }
      if (selectedTags.length > 0) {
        query.tags = selectedTags;
      }
      const images = await api.getReferenceImages(query);
      setReferenceImages(images);
    } catch (error) {
      message.error(`加载参考图失败: ${error}`);
    } finally {
      setReferenceLoading(false);
    }
  };

  const loadAllTags = async () => {
    try {
      const tags = await api.getAllTags();
      setAllTags(tags);
    } catch (error) {
      console.error('加载标签失败:', error);
    }
  };

  const openReferenceModal = async () => {
    setReferenceModalVisible(true);
    await loadAllTags();
    await loadReferenceImages();
  };

  const handleDeleteReference = async (characterName: string) => {
    try {
      await api.deleteReferenceImage(characterName);
      message.success('参考图已删除');
      await loadReferenceImages();
      await loadAllTags();
    } catch (error) {
      message.error(`删除失败: ${error}`);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) {
      message.warning('请输入标签');
      return;
    }
    try {
      await api.addTagToReference(addTagCharacter, newTag.trim());
      message.success('标签添加成功');
      setNewTag('');
      setAddTagModalVisible(false);
      await loadReferenceImages();
      await loadAllTags();
    } catch (error) {
      message.error(`添加标签失败: ${error}`);
    }
  };

  const handleRemoveTag = async (characterName: string, tag: string) => {
    try {
      await api.removeTagFromReference(characterName, tag);
      message.success('标签已移除');
      await loadReferenceImages();
      await loadAllTags();
    } catch (error) {
      message.error(`移除标签失败: ${error}`);
    }
  };

  const handleSaveImage = async (imageUrl: string) => {
    try {
      const saved = await api.saveImageDialog(imageUrl);
      if (saved) {
        message.success('图片已保存到: ' + saved);
      }
    } catch (error) {
      message.error('保存失败: ' + error);
    }
  };

  const examplePrompts = [
    '在阳光明媚的森林里@小明 正在愉快地跑步',
    '夜晚的城市街道@女孩 穿着漂亮的裙子行走',
    '海边的日落@英雄 站在礁石上',
  ];

  const batchExamplePrompts = {
    singleLine: [
      '在森林里@小明 跑步 | 海边@女孩 散步 | 山上@英雄',
      '@小明 和@小红 在公园 | @女孩 在学校 | @英雄 在城堡',
      '场景1：森林里@小明 场景2：海边@女孩 场景3：山上@英雄',
    ],
    multiLine: [
      '在森林里@小明 正在愉快地跑步\n海边@女孩 正在散步\n山上@英雄 站在礁石上',
      '@小明 在房间看书\n@女孩 在厨房做饭\n@英雄 在花园练剑',
      '场景1：在森林里@小明\n场景2：海边@女孩\n场景3：山上@英雄',
    ],
  };

  const themeConfig = useMemo(() => getThemeConfig(resolvedTheme === 'dark'), [resolvedTheme]);

  const handleApplyHistoryParams = (params: any) => {
    if (!params) return;

    if (params.prompt) setPrompt(params.prompt);
    if (params.model) setSelectedModel(params.model as 'seedream' | 'banana_pro');
    if (params.quality) setImageQuality(params.quality as 'standard' | 'high' | 'ultra');
    if (params.watermark !== undefined) setWatermark(params.watermark.toString());

    if (params.model === 'seedream' && params.width && params.height) {
      setSeedreamSize(`${params.width}x${params.height}`);
    } else if (params.model === 'banana_pro' && params.size) {
      setBananaResolution(params.size);
    }

    // Set image size ratio if possible
    if (params.width && params.height) {
      const w = params.width;
      const h = params.height;
      if (w === h) setImageSize({ width: 1, height: 1 });
      else if (w > h) setImageSize({ width: 16, height: 9 });
      else setImageSize({ width: 9, height: 16 });
    }

    setCurrentPage('workspace');
    message.success('已应用历史记录参数');
  };

  const handleRegenerateHistory = async (history: any, newParams?: any) => {
    const params = newParams || history.params;
    if (!params) return;

    setHistoryModalVisible(false);

    const segments = [{ index: 0, content: params.prompt, characters: [] }];
    const normalizedSegments = segments.map((seg, idx) => ({
      index: seg.index ?? idx,
      content: seg.content,
      characters: (seg.characters || []).map((char: any) => ({ name: char.name })),
    }));

    const task: GenerationQueueTask = {
      id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: `历史记录重生成 ${dayjs().format('HH:mm:ss')}`,
      mode: 'single',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      total: 1,
      current: 0,
      elapsedMs: 0,
      payload: {
        segments: normalizedSegments,
        model: params.model,
        imageQuality: params.quality || 'standard',
        watermark: params.watermark?.toString() || 'false',
        bananaResolution: params.size || '1024x1024',
        seedreamSize:
          params.width && params.height ? `${params.width}x${params.height}` : '1024x1024',
        imageSize:
          params.width && params.height
            ? { width: params.width, height: params.height }
            : { width: 1, height: 1 },
        concurrency: 1,
        batchMode: false,
        failStrategy: 'continue',
        testMode: false,
        mockDelayMs: 0,
        mockFailAt: null,
        characterBindings: {},
        parsedCharacters: history.characters || [],
        sourceHistoryId: history.id,
      },
      progress: {
        total: 1,
        current: 0,
        sceneResults: [{ index: 0, status: 'pending' }],
      },
    };

    setGenerationQueue(prev => [...prev, task]);
    setCurrentPage('workspace');
    setQueueModalVisible(true);
    message.success('已加入任务队列，将使用历史记录参数重新生成');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    if (page === 'gallery') {
      openReferenceModal();
    }
    if (page === 'history') {
      setHistoryModalVisible(true);
    }
    if (page === 'templates') {
      setTemplateModalVisible(true);
    }
  };

  const successRate =
    dashboardStats.todayTotal > 0
      ? Number(((dashboardStats.todaySuccess / dashboardStats.todayTotal) * 100).toFixed(1))
      : 0;
  const weekdayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const calendarLabel = `${nowTime.format('MM月DD日')} ${weekdayMap[nowTime.day()]}`;
  const calendarClock = nowTime.format('HH:mm:ss');
  const promptLimit = batchMode ? 2000 : 500;
  const promptUsageRatio = promptLimit > 0 ? prompt.length / promptLimit : 0;
  const promptCountColor =
    promptUsageRatio >= 0.9 ? '#ef4444' : promptUsageRatio >= 0.7 ? '#f59e0b' : '#6366f1';
  const formatTimeSafe = (value: string) => {
    if (!value) return '--';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '--';
    return d.toLocaleTimeString('zh-CN');
  };
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <Layout className="app-layout">
        <div className="header-bg" />
        <Sider
          width={48}
          collapsedWidth={48}
          theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            backgroundColor: resolvedTheme === 'dark' ? '#1e293b' : '#ffffff',
          }}
        >
          <Toolbar currentPage={currentPage} onNavigate={handleNavigate} />
        </Sider>
        <Layout style={{ marginLeft: 48 }}>
          <Header className="app-header">
            <div className="header-content">
              <RobotOutlined className="header-icon" />
              <Title level={4} className="header-title">
                泫晨懿然·灵犀绘梦
              </Title>
            </div>
            <Space size={12}>
              <Button
                type="text"
                icon={<SettingOutlined />}
                onClick={() => setConfigModalVisible(true)}
                style={{ color: '#fff', height: 36 }}
              >
                API配置
              </Button>
              <Button
                type="text"
                icon={<PictureOutlined />}
                onClick={openReferenceModal}
                style={{ color: '#fff', height: 36 }}
              >
                参考图库
              </Button>
              <Button
                type="text"
                icon={<FileTextOutlined />}
                onClick={() => setTemplateModalVisible(true)}
                style={{ color: '#fff', height: 36 }}
              >
                模板库
              </Button>
              <Button
                type="text"
                icon={<QuestionCircleOutlined />}
                onClick={() => setHelpModalVisible(true)}
                style={{ color: '#fff', height: 36 }}
              >
                使用帮助
              </Button>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'light',
                      icon: <SunOutlined />,
                      label: '亮色主题',
                      onClick: () => setMode('light'),
                    },
                    {
                      key: 'dark',
                      icon: <MoonOutlined />,
                      label: '暗色主题',
                      onClick: () => setMode('dark'),
                    },
                    {
                      key: 'system',
                      icon: <DesktopOutlined />,
                      label: '跟随系统',
                      onClick: () => setMode('system'),
                    },
                  ],
                }}
                trigger={['click']}
              >
                <Button type="text" style={{ color: '#fff', height: 36 }}>
                  {resolvedTheme === 'dark' ? <MoonOutlined /> : <SunOutlined />}
                </Button>
              </Dropdown>
            </Space>
          </Header>
          <Content className="app-content">
            {currentPage === 'stats' ? (
              <StatsPage />
            ) : (
              <div className="main-container">
                <SlideUp delay={0.05}>
                  <Card
                    className="result-card dashboard-card"
                    variant="borderless"
                    style={{
                      marginBottom: 12,
                      paddingTop: 6,
                      paddingBottom: 6,
                      background:
                        resolvedTheme === 'dark'
                          ? 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95))'
                          : 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(6,182,212,0.06))',
                    }}
                  >
                    <Spin spinning={dashboardLoading}>
                      <div
                        style={{
                          marginTop: 2,
                          paddingBottom: 2,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(5, 1fr)',
                          gap: 10,
                          width: '100%',
                        }}
                      >
                        <div
                          style={{
                            borderRadius: 10,
                            padding: '10px 12px',
                            minHeight: 72,
                            minWidth: 0,
                            background:
                              resolvedTheme === 'dark' ? 'rgba(15,23,42,0.78)' : '#ffffff',
                            border:
                              resolvedTheme === 'dark'
                                ? '1px solid rgba(148,163,184,0.25)'
                                : '1px solid #e5e7eb',
                            boxShadow:
                              resolvedTheme === 'dark' ? 'none' : '0 1px 3px rgba(15,23,42,0.06)',
                          }}
                        >
                          <Space size={6} align="start">
                            <AreaChartOutlined style={{ color: '#6366f1', fontSize: 13 }} />
                            <div>
                              <Text type="secondary" style={{ fontSize: 10 }}>
                                今日概览
                              </Text>
                              <div
                                style={{
                                  fontSize: 20,
                                  lineHeight: 1.2,
                                  fontWeight: 700,
                                  color: '#6366f1',
                                  fontVariantNumeric: 'tabular-nums',
                                  whiteSpace: 'nowrap',
                                  marginTop: 2,
                                }}
                              >
                                {calendarClock}
                              </div>
                              <Text
                                style={{
                                  fontSize: 10,
                                  color: resolvedTheme === 'dark' ? '#cbd5e1' : '#64748b',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {calendarLabel}
                              </Text>
                            </div>
                          </Space>
                        </div>
                        <div
                          style={{
                            borderRadius: 10,
                            padding: '10px 12px',
                            minHeight: 72,
                            minWidth: 0,
                            background:
                              resolvedTheme === 'dark' ? 'rgba(15,23,42,0.78)' : '#ffffff',
                            border:
                              resolvedTheme === 'dark'
                                ? '1px solid rgba(148,163,184,0.25)'
                                : '1px solid #e5e7eb',
                            boxShadow:
                              resolvedTheme === 'dark' ? 'none' : '0 1px 3px rgba(15,23,42,0.06)',
                          }}
                        >
                          <Space size={6} align="start">
                            <AreaChartOutlined style={{ color: '#6366f1', fontSize: 13 }} />
                            <div>
                              <Text type="secondary" style={{ fontSize: 10 }}>
                                生成总数
                              </Text>
                              <div style={{ fontSize: 20, lineHeight: 1.2, fontWeight: 700 }}>
                                {dashboardStats.todayTotal}
                              </div>
                            </div>
                          </Space>
                        </div>
                        <div
                          style={{
                            borderRadius: 10,
                            padding: '10px 12px',
                            minHeight: 72,
                            minWidth: 0,
                            background:
                              resolvedTheme === 'dark' ? 'rgba(15,23,42,0.78)' : '#ffffff',
                            border:
                              resolvedTheme === 'dark'
                                ? '1px solid rgba(148,163,184,0.25)'
                                : '1px solid #e5e7eb',
                            boxShadow:
                              resolvedTheme === 'dark' ? 'none' : '0 1px 3px rgba(15,23,42,0.06)',
                          }}
                        >
                          <Space size={6} align="start">
                            <CheckCircleOutlined style={{ color: '#10b981', fontSize: 13 }} />
                            <div>
                              <Text type="secondary" style={{ fontSize: 10 }}>
                                成功率
                              </Text>
                              <div
                                style={{
                                  fontSize: 20,
                                  lineHeight: 1.2,
                                  fontWeight: 700,
                                  color: '#10b981',
                                }}
                              >
                                {successRate}%
                              </div>
                            </div>
                          </Space>
                        </div>
                        <div
                          style={{
                            borderRadius: 10,
                            padding: '10px 12px',
                            minHeight: 72,
                            minWidth: 0,
                            background:
                              resolvedTheme === 'dark' ? 'rgba(15,23,42,0.78)' : '#ffffff',
                            border:
                              resolvedTheme === 'dark'
                                ? '1px solid rgba(148,163,184,0.25)'
                                : '1px solid #e5e7eb',
                            boxShadow:
                              resolvedTheme === 'dark' ? 'none' : '0 1px 3px rgba(15,23,42,0.06)',
                          }}
                        >
                          <Space size={6} align="start">
                            <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 13 }} />
                            <div>
                              <Text type="secondary" style={{ fontSize: 10 }}>
                                失败数
                              </Text>
                              <div
                                style={{
                                  fontSize: 20,
                                  lineHeight: 1.2,
                                  fontWeight: 700,
                                  color: '#ef4444',
                                }}
                              >
                                {dashboardStats.todayFailed}
                              </div>
                            </div>
                          </Space>
                        </div>
                        <div
                          style={{
                            borderRadius: 10,
                            padding: '10px 12px',
                            minHeight: 72,
                            minWidth: 0,
                            background:
                              resolvedTheme === 'dark' ? 'rgba(15,23,42,0.78)' : '#ffffff',
                            border:
                              resolvedTheme === 'dark'
                                ? '1px solid rgba(148,163,184,0.25)'
                                : '1px solid #e5e7eb',
                            boxShadow:
                              resolvedTheme === 'dark' ? 'none' : '0 1px 3px rgba(15,23,42,0.06)',
                          }}
                        >
                          <Space direction="vertical" size={2} style={{ width: '100%' }}>
                            <Text type="secondary" style={{ fontSize: 10 }}>
                              最近失败
                            </Text>
                            <Text
                              ellipsis={{ tooltip: true }}
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: resolvedTheme === 'dark' ? '#e2e8f0' : '#1f2937',
                              }}
                            >
                              {dashboardStats.latestFailedPrompt
                                ? `${dashboardStats.latestFailedPrompt}（${formatTimeSafe(
                                    dashboardStats.latestFailedAt
                                  )}）`
                                : '暂无'}
                            </Text>
                          </Space>
                        </div>
                      </div>
                    </Spin>
                  </Card>
                </SlideUp>
                <SlideUp delay={0.1}>
                  <Card className="prompt-card" variant="borderless">
                    <div className="card-header" style={{ justifyContent: 'space-between' }}>
                      <Space size={8} align="center">
                        <Title level={5} className="card-title">
                          输入提示词
                        </Title>
                        <Tooltip title="当前提示词长度 / 最大长度">
                          <Text
                            style={{
                              fontSize: 12,
                              color: promptCountColor,
                              fontWeight: 600,
                            }}
                          >
                            ({prompt.length} / {promptLimit})
                          </Text>
                        </Tooltip>
                      </Space>
                      <Space size="middle">
                        <span style={{ color: '#6366f1', fontWeight: 500 }}>
                          {batchMode ? '批量模式' : '单图模式'}
                        </span>
                        <Switch
                          checked={batchMode}
                          onChange={checked => {
                            setBatchMode(checked);
                            if (!checked) {
                              setParsedResult(null);
                            } else {
                              setBatchSplitResult(null);
                            }
                          }}
                          checkedChildren="批量"
                          unCheckedChildren="单图"
                        />
                      </Space>
                    </div>

                    {batchMode && (
                      <div
                        className="batch-config"
                        style={{
                          marginBottom: 16,
                          padding: '12px 16px',
                          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                          borderRadius: 12,
                          border: '1px solid #bae6fd',
                        }}
                      >
                        <Row gutter={16} align="middle">
                          <Col span={10}>
                            <Space>
                              <Tag color="blue">分隔符</Tag>
                              <Input
                                value={batchDelimiter}
                                onChange={e => setBatchDelimiter(e.target.value)}
                                placeholder="| 或 ;; 或 ---"
                                style={{ width: 120 }}
                                size="small"
                              />
                            </Space>
                          </Col>
                          <Col span={14}>
                            <Space>
                              <Tag color="purple">自动识别</Tag>
                              <Switch
                                checked={batchAutoDetect}
                                onChange={setBatchAutoDetect}
                                size="small"
                              />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                智能拆分场景
                              </Text>
                            </Space>
                          </Col>
                        </Row>
                      </div>
                    )}

                    <div style={{ marginBottom: 12 }}>
                      <Space.Compact style={{ width: '100%' }}>
                        <Select
                          allowClear
                          showSearch
                          placeholder="提示词历史（可一键复用）"
                          style={{ width: '100%' }}
                          value={undefined}
                          searchValue={promptHistorySearch}
                          onSearch={setPromptHistorySearch}
                          optionFilterProp="label"
                          options={filteredPromptHistories.map(item => ({
                            value: item.prompt,
                            label:
                              item.prompt.length > 60
                                ? `${item.prompt.slice(0, 60)}...`
                                : item.prompt,
                          }))}
                          onSelect={value => {
                            if (typeof value === 'string') {
                              setPrompt(value);
                              setPromptHistorySearch('');
                            }
                          }}
                        />
                        <Button
                          onClick={() => {
                            if (promptHistories.length > 0) {
                              setPrompt(promptHistories[0].prompt);
                            } else {
                              message.warning('暂无历史提示词');
                            }
                          }}
                        >
                          最近一条
                        </Button>
                        <Button
                          danger
                          disabled={filteredPromptHistories.length === 0}
                          onClick={() => {
                            const target = filteredPromptHistories[0];
                            if (target) {
                              void handleDeletePromptHistory(target.id);
                            }
                          }}
                        >
                          删首条
                        </Button>
                        <Popconfirm
                          title="确认清空提示词历史？"
                          description="此操作不可恢复"
                          onConfirm={handleClearPromptHistory}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button danger disabled={promptHistories.length === 0}>
                            清空
                          </Button>
                        </Popconfirm>
                      </Space.Compact>
                    </div>

                    <TextArea
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      onPressEnter={e => {
                        if (prompt.trim()) return;
                        const first = filteredPromptHistories[0];
                        if (first) {
                          e.preventDefault();
                          setPrompt(first.prompt);
                          message.success('已回填最近提示词');
                        }
                      }}
                      placeholder={
                        batchMode
                          ? '输入多个场景，用分隔符分开，如：场景1描述 | 场景2描述 | 场景3描述'
                          : '描述你的画面，如：在森林里@小明 正在跑步...'
                      }
                      rows={batchMode ? 6 : 4}
                      className="prompt-input"
                      maxLength={batchMode ? 2000 : 500}
                      showCount={false}
                    />
                    <div className="prompt-actions">
                      {batchMode ? (
                        <Button
                          type="primary"
                          onClick={handleBatchSplit}
                          loading={batchSplitLoading}
                          size="large"
                          icon={<AppstoreOutlined />}
                          className="parse-btn"
                        >
                          拆分场景
                        </Button>
                      ) : (
                        <Button
                          type="primary"
                          onClick={handleParse}
                          loading={loading}
                          size="large"
                          icon={<PlayCircleOutlined />}
                          className="parse-btn"
                        >
                          开始解析
                        </Button>
                      )}
                    </div>
                    <div className="example-prompts">
                      <Text type="secondary" className="example-label">
                        试试看：
                      </Text>
                      <Space wrap>
                        {batchMode ? (
                          <>
                            <Text type="secondary" style={{ marginRight: 8 }}>
                              单行：
                            </Text>
                            {batchExamplePrompts.singleLine.map((example, idx) => (
                              <Tag
                                key={`single-${idx}`}
                                className="example-tag"
                                onClick={() => setPrompt(example)}
                              >
                                {example.slice(0, 20)}...
                              </Tag>
                            ))}
                            <Text type="secondary" style={{ marginRight: 8, marginLeft: 16 }}>
                              多行：
                            </Text>
                            {batchExamplePrompts.multiLine.map((example, idx) => (
                              <Tag
                                key={`multi-${idx}`}
                                className="example-tag"
                                onClick={() => setPrompt(example)}
                              >
                                {example.slice(0, 20)}...
                              </Tag>
                            ))}
                          </>
                        ) : (
                          examplePrompts.map((example, idx) => (
                            <Tag
                              key={`single-prompt-${idx}`}
                              className="example-tag"
                              onClick={() => setPrompt(example)}
                            >
                              {example.slice(0, 20)}...
                            </Tag>
                          ))
                        )}
                      </Space>
                    </div>
                  </Card>
                </SlideUp>

                {batchMode && (
                  <Spin spinning={batchSplitLoading}>
                    {batchSplitResult && (
                      <FadeIn>
                        <Card
                          className="result-card batch-result-card"
                          variant="borderless"
                          style={{ marginTop: 16 }}
                        >
                          <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
                            <Space>
                              <AppstoreOutlined style={{ color: '#6366f1', fontSize: 18 }} />
                              <Title level={5} className="card-title">
                                批量拆分结果
                              </Title>
                              <Tag color="blue" style={{ marginLeft: 8 }}>
                                {batchSplitResult.total} 个场景
                              </Tag>
                              <Button
                                size="small"
                                icon={<LinkOutlined />}
                                onClick={() => {
                                  const allChars = new Set<string>();
                                  batchSplitResult.segments.forEach((seg: any) => {
                                    (seg.characters || []).forEach((char: any) =>
                                      allChars.add(char.name)
                                    );
                                  });
                                  const chars = Array.from(allChars);
                                  if (chars.length === 0) {
                                    message.warning('没有需要绑定的角色');
                                    return;
                                  }
                                  openBindingModal(chars);
                                }}
                              >
                                全局绑定所有角色
                              </Button>
                            </Space>
                            <Space>
                              <Button
                                size="small"
                                icon={<UnorderedListOutlined />}
                                onClick={() => setQueueModalVisible(true)}
                              >
                                任务队列（
                                {generationQueue.filter(t => t.status === 'pending').length}）
                              </Button>
                              <Button
                                size="small"
                                icon={<SettingOutlined />}
                                onClick={() => setBatchGenModalVisible(true)}
                              >
                                生成设置
                              </Button>
                              <Button
                                type="primary"
                                size="small"
                                icon={<PlayCircleOutlined />}
                                loading={batchGenerating}
                                onClick={enqueueGenerationTask}
                                style={{
                                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                  border: 'none',
                                }}
                              >
                                加入队列
                              </Button>
                            </Space>
                          </div>
                          <div className="batch-segments-container">
                            <Collapse
                              ghost
                              expandIconPosition="end"
                              className="premium-collapse"
                              items={batchSplitResult.segments.map((seg, idx) => ({
                                key: `segment-${seg.index}`,
                                label: (
                                  <div className="segment-header-flex">
                                    <Space>
                                      <Tag color="purple">场景 {seg.index}</Tag>
                                      <Text strong className="segment-preview">
                                        {seg.content.length > 30
                                          ? seg.content.substring(0, 30) + '...'
                                          : seg.content}
                                      </Text>
                                    </Space>
                                    <div className="segment-characters-preview">
                                      {seg.characters.map(char => (
                                        <Tag key={char.name} color="blue">
                                          @{char.name}
                                        </Tag>
                                      ))}
                                    </div>
                                  </div>
                                ),
                                children: (
                                  <div className="segment-expanded-content">
                                    <div className="info-section">
                                      <div className="info-item">
                                        <Text type="secondary" className="info-label">
                                          场景描述
                                        </Text>
                                        <div className="info-value scene-description">
                                          {seg.content}
                                        </div>
                                      </div>
                                    </div>

                                    <Divider style={{ margin: '16px 0' }} />

                                    <div className="info-section characters-section">
                                      <Title level={5} style={{ fontSize: 14, marginBottom: 12 }}>
                                        <UserOutlined style={{ marginRight: 8 }} />
                                        主角色与参考图绑定
                                      </Title>
                                      <div className="character-list">
                                        {seg.characters.map(char => {
                                          const binding = characterBindings[char.name];
                                          return (
                                            <div key={char.name} className="character-item">
                                              <div className="character-avatar">
                                                {binding?.referenceImagePath ? (
                                                  <img
                                                    src={api.getImageUrl(
                                                      binding.referenceImagePath
                                                    )}
                                                    alt={char.name}
                                                    style={{
                                                      width: '100%',
                                                      height: '100%',
                                                      objectFit: 'cover',
                                                      borderRadius: '50%',
                                                    }}
                                                  />
                                                ) : (
                                                  char.name.charAt(0).toUpperCase()
                                                )}
                                              </div>
                                              <div className="character-info">
                                                <Text strong>@{char.name}</Text>
                                                <Tag
                                                  color={
                                                    binding?.referenceImagePath
                                                      ? 'green'
                                                      : 'default'
                                                  }
                                                >
                                                  {binding?.referenceImagePath
                                                    ? '已绑定'
                                                    : '未绑定'}
                                                </Tag>
                                              </div>
                                              <div className="character-actions">
                                                {binding?.referenceImagePath ? (
                                                  <Button
                                                    size="small"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => handleUnbind(char.name)}
                                                  >
                                                    解绑
                                                  </Button>
                                                ) : (
                                                  <Button
                                                    size="small"
                                                    type="primary"
                                                    icon={<UploadOutlined />}
                                                    onClick={() => openBindingModal(char.name)}
                                                  >
                                                    绑定参考图
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {batchProgress?.sceneResults[idx]?.result?.success && (
                                      <>
                                        <Divider style={{ margin: '16px 0' }} />
                                        <div className="scene-generation-result">
                                          <Title
                                            level={5}
                                            style={{ fontSize: 14, marginBottom: 12 }}
                                          >
                                            <PictureOutlined style={{ marginRight: 8 }} />
                                            生成结果
                                          </Title>
                                          <div className="scene-result-images">
                                            {batchProgress.sceneResults[idx].result.images.map(
                                              (img: string, iidx: number) => (
                                                <div
                                                  key={iidx}
                                                  className="scene-img-wrapper"
                                                  style={{
                                                    position: 'relative',
                                                    display: 'inline-block',
                                                    margin: '4px',
                                                  }}
                                                >
                                                  <Image
                                                    src={img}
                                                    className="scene-img"
                                                    style={{ width: 200, borderRadius: 8 }}
                                                    preview={{
                                                      mask: (
                                                        <div style={{ fontSize: 14 }}>
                                                          <EyeOutlined style={{ marginRight: 4 }} />
                                                          点击放大
                                                        </div>
                                                      ),
                                                    }}
                                                  />
                                                  <Button
                                                    type="primary"
                                                    icon={<DownloadOutlined />}
                                                    size="small"
                                                    onClick={() => handleSaveImage(img)}
                                                    style={{
                                                      position: 'absolute',
                                                      top: 8,
                                                      right: 8,
                                                      zIndex: 10,
                                                    }}
                                                  />
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ),
                              }))}
                            />
                          </div>
                        </Card>
                      </FadeIn>
                    )}
                  </Spin>
                )}

                <Modal
                  title="批量生成设置"
                  open={batchGenModalVisible}
                  onOk={() => setBatchGenModalVisible(false)}
                  onCancel={() => setBatchGenModalVisible(false)}
                  width={600}
                  footer={[
                    <Button key="cancel" onClick={() => setBatchGenModalVisible(false)}>
                      取消
                    </Button>,
                    <Button key="ok" type="primary" onClick={() => setBatchGenModalVisible(false)}>
                      确定
                    </Button>,
                  ]}
                >
                  <div style={{ padding: '8px 0' }}>
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Text strong>模型：</Text>
                        <Select
                          value={selectedModel}
                          onChange={setSelectedModel}
                          style={{ width: '100%', marginTop: 4 }}
                          options={[
                            { value: 'seedream', label: 'Seedream 4.5' },
                            { value: 'banana_pro', label: 'Banana 2' },
                          ]}
                        />
                      </Col>
                      <Col span={12}>
                        <Text strong>生成模式：</Text>
                        <Select
                          value={batchGenerationMode}
                          onChange={setBatchGenerationMode}
                          style={{ width: '100%', marginTop: 4 }}
                          options={[
                            { value: 'parallel', label: '并行生成' },
                            { value: 'sequential', label: '顺序生成' },
                          ]}
                        />
                      </Col>
                    </Row>
                    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                      <Col span={12}>
                        <Text strong>并发数：</Text>
                        <InputNumber
                          min={1}
                          max={5}
                          value={concurrency}
                          onChange={value => setConcurrency(value || 2)}
                          style={{ width: '100%', marginTop: 4 }}
                          disabled={batchGenerationMode === 'sequential'}
                        />
                      </Col>
                      <Col span={12}>
                        <Text strong>失败策略：</Text>
                        <Select
                          value={failStrategy}
                          onChange={setFailStrategy}
                          style={{ width: '100%', marginTop: 4 }}
                          options={[
                            { value: 'continue', label: '失败后继续' },
                            { value: 'stop', label: '失败后停止' },
                          ]}
                        />
                      </Col>
                    </Row>
                    <Divider style={{ margin: '16px 0' }} />
                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <Text strong>队列测试模式：</Text>
                        <div style={{ marginTop: 4 }}>
                          <Switch checked={queueTestMode} onChange={setQueueTestMode} />
                        </div>
                      </Col>
                      <Col span={8}>
                        <Text strong>模拟延迟(ms)：</Text>
                        <InputNumber
                          min={200}
                          max={8000}
                          step={100}
                          value={queueMockDelayMs}
                          onChange={value => setQueueMockDelayMs(value || 1200)}
                          style={{ width: '100%', marginTop: 4 }}
                          disabled={!queueTestMode}
                        />
                      </Col>
                      <Col span={8}>
                        <Text strong>失败场景序号：</Text>
                        <InputNumber
                          min={1}
                          max={100}
                          value={queueMockFailAt ?? undefined}
                          onChange={value => setQueueMockFailAt(value ? Number(value) : null)}
                          style={{ width: '100%', marginTop: 4 }}
                          disabled={!queueTestMode}
                          placeholder="留空表示不失败"
                        />
                      </Col>
                    </Row>
                    {queueTestMode ? (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginTop: 12 }}
                        message="测试模式已开启：不调用真实生图 API，不写入历史，仅用于验证队列流程。"
                      />
                    ) : null}

                    {selectedModel === 'seedream' ? (
                      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                        <Col span={12}>
                          <Text strong>图片尺寸：</Text>
                          <Select
                            value={seedreamSize}
                            onChange={setSeedreamSize}
                            style={{ width: '100%', marginTop: 4 }}
                            options={[
                              { value: '1024x1024', label: '1K (1024x1024)' },
                              { value: '2048x2048', label: '2K (2048x2048)' },
                              { value: '4096x4096', label: '4K (4096x4096)' },
                            ]}
                          />
                        </Col>
                        <Col span={12}>
                          <Text strong>图片质量：</Text>
                          <Select
                            value={imageQuality}
                            onChange={setImageQuality}
                            style={{ width: '100%', marginTop: 4 }}
                            options={[
                              { value: 'standard', label: '标准' },
                              { value: 'high', label: '高清' },
                              { value: 'ultra', label: '超清' },
                            ]}
                          />
                        </Col>
                        <Col span={12}>
                          <Text strong>组图功能：</Text>
                          <Select
                            value={sequentialImageGeneration}
                            onChange={setSequentialImageGeneration}
                            style={{ width: '100%', marginTop: 4 }}
                            options={[
                              { value: 'disabled', label: '关闭' },
                              { value: 'auto', label: '自动' },
                            ]}
                          />
                        </Col>
                        <Col span={12}>
                          <Text strong>返回格式：</Text>
                          <Select
                            value={responseFormat}
                            onChange={setResponseFormat}
                            style={{ width: '100%', marginTop: 4 }}
                            options={[
                              { value: 'url', label: 'URL链接' },
                              { value: 'b64_json', label: 'Base64' },
                            ]}
                          />
                        </Col>
                        <Col span={12}>
                          <Text strong>水印：</Text>
                          <Select
                            value={watermark}
                            onChange={setWatermark}
                            style={{ width: '100%', marginTop: 4 }}
                            options={[
                              { value: 'false', label: '无水印' },
                              { value: 'true', label: '有水印' },
                            ]}
                          />
                        </Col>
                      </Row>
                    ) : (
                      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                        <Col span={12}>
                          <Text strong>图片比例：</Text>
                          <Select
                            value={`${imageSize.width}:${imageSize.height}`}
                            onChange={value => {
                              const [w, h] = value.split(':').map(Number);
                              setImageSize({ width: w, height: h });
                            }}
                            style={{ width: '100%', marginTop: 4 }}
                            options={[
                              { value: '1:1', label: '1:1 (方形)' },
                              { value: '16:9', label: '16:9 (横版)' },
                              { value: '9:16', label: '9:16 (竖版)' },
                              { value: '4:3', label: '4:3' },
                              { value: '3:4', label: '3:4' },
                            ]}
                          />
                        </Col>
                        <Col span={12}>
                          <Text strong>分辨率：</Text>
                          <Select
                            value={bananaResolution}
                            onChange={setBananaResolution}
                            style={{ width: '100%', marginTop: 4 }}
                            options={[
                              { value: '1K', label: '1K (1024)' },
                              { value: '2K', label: '2K (2048)' },
                              { value: '4K', label: '4K (4096)' },
                            ]}
                          />
                        </Col>
                      </Row>
                    )}
                  </div>
                </Modal>

                <Modal
                  title="任务队列中心"
                  open={queueModalVisible}
                  onCancel={() => setQueueModalVisible(false)}
                  width={820}
                  footer={[
                    <Button key="clear" onClick={handleClearFinishedQueue}>
                      清理已结束
                    </Button>,
                    <Button key="close" type="primary" onClick={() => setQueueModalVisible(false)}>
                      关闭
                    </Button>,
                  ]}
                >
                  <Space
                    style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}
                  >
                    <Text type="secondary">
                      待执行 {generationQueue.filter(t => t.status === 'pending').length} / 运行中{' '}
                      {generationQueue.filter(t => t.status === 'running').length}
                    </Text>
                    <Text type="secondary">
                      当前进度：{batchProgress?.current || 0}/{batchProgress?.total || 0}
                    </Text>
                  </Space>
                  <List
                    dataSource={generationQueue}
                    locale={{ emptyText: '暂无任务' }}
                    renderItem={task => (
                      <List.Item
                        actions={[
                          task.status === 'pending' || task.status === 'running' ? (
                            <Button
                              key="pause"
                              size="small"
                              icon={<PauseCircleOutlined />}
                              onClick={() => handlePauseQueueTask(task.id)}
                            >
                              暂停
                            </Button>
                          ) : null,
                          task.status === 'paused' ? (
                            <Button
                              key="resume"
                              size="small"
                              type="primary"
                              icon={<PlayCircleOutlined />}
                              onClick={() => handleResumeQueueTask(task.id)}
                            >
                              继续
                            </Button>
                          ) : null,
                          task.status === 'running' || task.status === 'pending' ? (
                            <Button
                              key="cancel"
                              size="small"
                              danger
                              icon={<StopOutlined />}
                              onClick={() => handleCancelQueueTask(task.id)}
                            >
                              取消
                            </Button>
                          ) : null,
                          task.status === 'failed' || task.status === 'cancelled' ? (
                            <Button
                              key="retry"
                              size="small"
                              icon={<ReloadOutlined />}
                              onClick={() => handleRetryQueueTask(task.id)}
                            >
                              重试
                            </Button>
                          ) : null,
                        ].filter(Boolean)}
                      >
                        <List.Item.Meta
                          title={
                            <Space>
                              <Text strong>{task.name}</Text>
                              <Tag
                                color={
                                  task.status === 'running'
                                    ? 'processing'
                                    : task.status === 'completed'
                                      ? 'success'
                                      : task.status === 'failed'
                                        ? 'error'
                                        : task.status === 'cancelled'
                                          ? 'default'
                                          : task.status === 'paused'
                                            ? 'warning'
                                            : 'blue'
                                }
                              >
                                {task.status}
                              </Tag>
                              <Tag>{task.mode === 'batch' ? '批量' : '单图'}</Tag>
                              {task.payload.testMode ? <Tag color="gold">测试模式</Tag> : null}
                            </Space>
                          }
                          description={
                            <Space direction="vertical" size={2}>
                              <Text type="secondary">
                                进度 {task.progress.current}/{task.progress.total} · 创建于{' '}
                                {dayjs(task.createdAt).format('HH:mm:ss')}
                              </Text>
                              <Text type="secondary">
                                生成耗时{' '}
                                {formatDuration(
                                  task.elapsedMs +
                                    (task.status === 'running' && task.runStartedAt
                                      ? Math.max(
                                          0,
                                          nowTime.valueOf() - new Date(task.runStartedAt).getTime()
                                        )
                                      : 0)
                                )}
                              </Text>
                              {task.error ? <Text type="danger">错误：{task.error}</Text> : null}
                              {task.progress.sceneResults.filter(s => s.status === 'failed')
                                .length > 0 && (
                                <Text type="danger">
                                  失败分段：
                                  {task.progress.sceneResults
                                    .filter(s => s.status === 'failed')
                                    .map(s => {
                                      const err = s.result?.error || '未知错误';
                                      return `场景${s.index + 1}: ${err.slice(0, 30)}${err.length > 30 ? '...' : ''}`;
                                    })
                                    .join(' | ')}
                                </Text>
                              )}
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Modal>

                {!batchMode && (
                  <Spin spinning={loading}>
                    {parsedResult ? (
                      <div className="results-container">
                        <Card className="result-card original-card" variant="borderless">
                          <div className="card-header">
                            <Title level={5} className="card-title">
                              解析结果
                            </Title>
                            <Space style={{ marginLeft: 'auto' }}>
                              <Button
                                size="small"
                                icon={<UnorderedListOutlined />}
                                onClick={() => setQueueModalVisible(true)}
                              >
                                任务队列（
                                {generationQueue.filter(t => t.status === 'pending').length}）
                              </Button>
                              <Button
                                size="small"
                                icon={<SettingOutlined />}
                                onClick={() => setBatchGenModalVisible(true)}
                              >
                                生成设置
                              </Button>
                              <Button
                                type="primary"
                                size="small"
                                icon={<PlayCircleOutlined />}
                                loading={batchGenerating}
                                onClick={enqueueGenerationTask}
                                disabled={!parsedResult}
                                style={{
                                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                  border: 'none',
                                }}
                              >
                                加入队列
                              </Button>
                            </Space>
                          </div>
                          <Collapse
                            ghost
                            expandIconPosition="end"
                            className="premium-collapse"
                            items={[
                              {
                                key: '1',
                                label: (
                                  <Space>
                                    <Tag color="blue">原始提示词</Tag>
                                    <Tag color="green">{parsedResult.characters.length} 个角色</Tag>
                                    <Tag color="purple">{parsedResult.segments.length} 个分段</Tag>
                                  </Space>
                                ),
                                children: (
                                  <div>
                                    <div style={{ marginBottom: 16 }}>
                                      <strong>原始提示词：</strong>
                                      {parsedResult.original}
                                    </div>

                                    {parsedResult.characters.length > 0 && (
                                      <div className="character-list" style={{ marginBottom: 16 }}>
                                        <strong>角色：</strong>
                                        <div style={{ marginTop: 8 }}>
                                          {parsedResult.characters.map(char => {
                                            const binding = characterBindings[char.name];
                                            return (
                                              <div key={char.name} className="character-item">
                                                <div className="character-avatar">
                                                  {binding?.referenceImagePath ? (
                                                    <img
                                                      src={api.getImageUrl(
                                                        binding.referenceImagePath
                                                      )}
                                                      alt={char.name}
                                                      style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        borderRadius: '50%',
                                                      }}
                                                    />
                                                  ) : (
                                                    char.name.charAt(0).toUpperCase()
                                                  )}
                                                </div>
                                                <div className="character-info">
                                                  <Text strong>@{char.name}</Text>
                                                  <Tag color={char.bound ? 'green' : 'default'}>
                                                    {char.bound ? '已绑定' : '未绑定'}
                                                  </Tag>
                                                </div>
                                                <div className="character-actions">
                                                  {char.bound ? (
                                                    <Button
                                                      size="small"
                                                      danger
                                                      icon={<DeleteOutlined />}
                                                      onClick={() => handleUnbind(char.name)}
                                                    >
                                                      解绑
                                                    </Button>
                                                  ) : (
                                                    <Button
                                                      size="small"
                                                      type="primary"
                                                      icon={<UploadOutlined />}
                                                      onClick={() => openBindingModal(char.name)}
                                                    >
                                                      绑定
                                                    </Button>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {parsedResult.segments.length > 0 && (
                                      <div className="segment-list">
                                        <strong>内容分段：</strong>
                                        <div style={{ marginTop: 8 }}>
                                          {parsedResult.segments.map((seg, idx) => {
                                            const tagInfo =
                                              segmentTags[seg.type] || segmentTags.other;
                                            return (
                                              <div key={`segment-${idx}`} className="segment-item">
                                                <Tag color={tagInfo.color}>{seg.type}</Tag>
                                                <Text>{seg.content}</Text>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {generationResult && (
                                      <ScaleIn>
                                        <div style={{ marginTop: 16 }}>
                                          <Divider style={{ margin: '16px 0' }} />
                                          <div className="card-header">
                                            <Title level={5} className="card-title">
                                              生成结果
                                            </Title>
                                            {generationResult.success ? (
                                              <Tag color="green">成功</Tag>
                                            ) : (
                                              <Tag color="red">失败</Tag>
                                            )}
                                          </div>

                                          {generationResult.success ? (
                                            <Row gutter={16}>
                                              {generationResult.images.map((img, idx) => (
                                                <Col key={`gen-img-${idx}`} span={12}>
                                                  <Image
                                                    src={img}
                                                    alt={`生成图片 ${idx + 1}`}
                                                    style={{ width: '100%', borderRadius: 8 }}
                                                  />
                                                  <Button
                                                    type="link"
                                                    icon={<DownloadOutlined />}
                                                    onClick={() => handleSaveImage(img)}
                                                    style={{ marginTop: 8 }}
                                                  >
                                                    保存到本地
                                                  </Button>
                                                </Col>
                                              ))}
                                            </Row>
                                          ) : (
                                            <Alert
                                              message="生成失败"
                                              description={generationResult.error}
                                              type="error"
                                              showIcon
                                            />
                                          )}
                                        </div>
                                      </ScaleIn>
                                    )}
                                  </div>
                                ),
                              },
                            ]}
                          />
                        </Card>

                        {parsedResult.characters.length === 0 &&
                          parsedResult.segments.length === 0 && (
                            <Card className="result-card" variant="borderless">
                              <Empty
                                description="未检测到角色或分段"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                              />
                            </Card>
                          )}

                        {parsedResult.characters.length === 0 &&
                          parsedResult.segments.length === 0 && (
                            <Card className="result-card" variant="borderless">
                              <Empty
                                description="未检测到角色或分段"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                              />
                            </Card>
                          )}
                      </div>
                    ) : null}
                  </Spin>
                )}
              </div>
            )}
          </Content>
        </Layout>
      </Layout>

      <Modal
        title={
          <div>
            <div style={{ marginBottom: 8 }}>绑定参考图</div>
            {charactersToBind.length > 1 && (
              <div style={{ fontSize: 12, color: '#666' }}>
                <div style={{ marginBottom: 4 }}>选择要绑定的角色：</div>
                <Checkbox.Group
                  value={charactersToBind}
                  onChange={values => setCharactersToBind(values as string[])}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
                >
                  {Array.from(new Set(charactersToBind)).map(charName => (
                    <Checkbox key={charName} value={charName}>
                      @{charName}
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              </div>
            )}
          </div>
        }
        open={bindingModalVisible}
        onCancel={() => setBindingModalVisible(false)}
        footer={null}
        width={600}
      >
        <div className="binding-modal-content">
          <Tabs
            activeKey={activeTab}
            onChange={key => setActiveTab(key as 'upload' | 'library')}
            items={[
              {
                key: 'upload',
                label: '上传图片',
                children: (
                  <>
                    <div className="image-type-selection">
                      <Text strong>参考图类型：</Text>
                      <Radio.Group
                        value={imageType}
                        onChange={e => setImageType(e.target.value)}
                        style={{ marginLeft: 16 }}
                      >
                        <Radio value="人物">人物</Radio>
                        <Radio value="人脸">人脸</Radio>
                        <Radio value="全身">全身</Radio>
                        <Radio value="场景">场景</Radio>
                      </Radio.Group>
                    </div>

                    <div
                      className="image-upload-section"
                      style={{ marginTop: 16 }}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <input
                        key={`file-input-${selectedCharacter}-${Date.now()}`}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        id="image-upload"
                      />
                      <label htmlFor="image-upload">
                        <div
                          className="upload-trigger"
                          style={{
                            border: `2px dashed ${isDragging ? '#1890ff' : '#d9d9d9'}`,
                            borderRadius: 8,
                            padding: 40,
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: uploadedImage ? '#f5f5f5' : '#fafafa',
                            transition: 'all 0.3s',
                          }}
                        >
                          {uploadedImage ? (
                            <div style={{ position: 'relative' }}>
                              <img
                                src={api.getImageUrl(uploadedImage)}
                                alt="预览"
                                style={{ maxWidth: '100%', maxHeight: 250, borderRadius: 4 }}
                              />
                              {isDragging && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'rgba(24, 144, 255, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 4,
                                  }}
                                >
                                  <Text strong style={{ color: '#fff', fontSize: 18 }}>
                                    释放以上传
                                  </Text>
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              <UploadOutlined
                                style={{ fontSize: 32, color: isDragging ? '#1890ff' : '#999' }}
                              />
                              <div style={{ marginTop: 8, color: isDragging ? '#1890ff' : '#999' }}>
                                点击选择图片 或 拖拽图片到这里
                              </div>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  </>
                ),
              },
              {
                key: 'library',
                label: '从图库选择',
                children: (
                  <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                    {referenceImageLibrary.length > 0 ? (
                      <List
                        grid={{ gutter: 16, column: 2 }}
                        dataSource={referenceImageLibrary}
                        renderItem={item => (
                          <List.Item>
                            <div
                              onClick={() => handleSelectFromLibrary(item)}
                              style={{
                                cursor: 'pointer',
                                border: '2px solid #f0f0f0',
                                borderRadius: 8,
                                padding: 4,
                                transition: 'all 0.3s',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = '#1890ff';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = '#f0f0f0';
                              }}
                            >
                              <Image
                                src={api.getImageUrl(item.referenceImagePath || '')}
                                alt={item.characterName}
                                style={{
                                  width: '100%',
                                  height: 120,
                                  objectFit: 'cover',
                                  borderRadius: 4,
                                }}
                              />
                              <div style={{ marginTop: 8, textAlign: 'center' }}>
                                <Tag color={item.imageType === '人物' ? 'blue' : 'green'}>
                                  {item.imageType}
                                </Tag>
                                <Text strong>@{item.characterName}</Text>
                              </div>
                            </div>
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty
                        description="暂无已保存的参考图"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </div>
                ),
              },
            ]}
          />

          <div className="binding-actions" style={{ marginTop: 24, textAlign: 'right' }}>
            <Button onClick={() => setBindingModalVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button
              type="primary"
              onClick={handleBindSubmit}
              loading={bindingLoading}
              disabled={!uploadedImage}
            >
              确认绑定
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        title="API配置"
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        onOk={handleSaveConfig}
        okText="保存"
      >
        <div style={{ padding: '16px 0' }}>
          <Divider>Seeddream API</Divider>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Base URL:</Text>
            <Input
              value={apiConfig.seedream.baseUrl}
              onChange={e =>
                setApiConfig({
                  ...apiConfig,
                  seedream: { ...apiConfig.seedream, baseUrl: e.target.value },
                })
              }
              placeholder="https://api.zhongzhuan.chat"
              style={{ marginTop: 4 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>API Key:</Text>
            <Input.Password
              value={apiConfig.seedream.apiKey}
              onChange={e =>
                setApiConfig({
                  ...apiConfig,
                  seedream: { ...apiConfig.seedream, apiKey: e.target.value },
                })
              }
              placeholder="请输入API Key"
              style={{ marginTop: 4 }}
            />
            <Button
              type="link"
              onClick={() => handleTestApi('seedream')}
              loading={testingApi === 'seedream'}
              style={{ marginTop: 4, padding: 0 }}
            >
              测试连接
            </Button>
          </div>

          <Divider>Banana 2 API</Divider>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Base URL:</Text>
            <Input
              value={apiConfig.bananaPro.baseUrl}
              onChange={e =>
                setApiConfig({
                  ...apiConfig,
                  bananaPro: { ...apiConfig.bananaPro, baseUrl: e.target.value },
                })
              }
              placeholder="https://api.bananaprostudio.com"
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Text strong>API Key:</Text>
            <Input.Password
              value={apiConfig.bananaPro.apiKey}
              onChange={e =>
                setApiConfig({
                  ...apiConfig,
                  bananaPro: { ...apiConfig.bananaPro, apiKey: e.target.value },
                })
              }
              placeholder="请输入API Key"
              style={{ marginTop: 4 }}
            />
            <Button
              type="link"
              onClick={() => handleTestApi('banana_pro')}
              loading={testingApi === 'banana_pro'}
              style={{ marginTop: 4, padding: 0 }}
            >
              测试连接
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        title="使用说明"
        open={helpModalVisible}
        onCancel={() => setHelpModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setHelpModalVisible(false)}>
            知道了
          </Button>,
        ]}
        width={600}
      >
        <div style={{ padding: '8px 0' }}>
          <Alert
            message="🌓 主题切换"
            description={
              <div style={{ color: '#666' }}>
                <p>
                  点击界面右上角的
                  <Text strong style={{ color: '#6366f1' }}>
                    主题切换
                  </Text>
                  按钮（太阳/月亮图标）可以切换主题：
                </p>
                <ul style={{ paddingLeft: 20, margin: '4px 0' }}>
                  <li>
                    <Text style={{ color: '#10b981' }}>亮色主题</Text> - 浅色背景，适合白天使用
                  </li>
                  <li>
                    <Text style={{ color: '#8b5cf6' }}>暗色主题</Text> - 深色背景，减少眼睛疲劳
                  </li>
                  <li>
                    <Text style={{ color: '#f59e0b' }}>跟随系统</Text> - 自动跟随操作系统的主题设置
                  </li>
                </ul>
                <p>主题设置会自动保存，下次打开应用时保持上次的选择。</p>
              </div>
            }
            style={{ marginBottom: 16 }}
          />
          <Steps
            current={0}
            direction="vertical"
            items={[
              {
                title: '第一步：召唤出窗口',
                description: (
                  <div style={{ color: '#666', marginBottom: 8 }}>
                    <p>
                      如果看不见窗口，按{' '}
                      <Text strong style={{ color: '#6366f1' }}>
                        Ctrl + Shift + P
                      </Text>{' '}
                      或者点击屏幕右下角的托盘图标（小机器人图标）
                    </p>
                  </div>
                ),
              },
              {
                title: '第二步：输入提示词',
                description: (
                  <div style={{ color: '#666', marginBottom: 8 }}>
                    <p>在输入框中描述你想要生成的画面</p>
                    <p>
                      <Text strong style={{ color: '#8b5cf6' }}>
                        绑定角色：
                      </Text>{' '}
                      在角色名字前加{' '}
                      <Text code style={{ color: '#ef4444' }}>
                        @
                      </Text>{' '}
                      符号，例如：
                      <br />
                      <Text code mark>
                        在森林里@小明 正在跑步
                      </Text>
                    </p>
                    <p>
                      <Text strong style={{ color: '#10b981' }}>
                        提示词历史：
                      </Text>{' '}
                      点击<Text style={{ color: '#6366f1' }}>「开始解析」</Text>或
                      <Text style={{ color: '#6366f1' }}>「拆分场景」</Text>后会自动保存提示词，
                      可通过输入框上方的<Text style={{ color: '#6366f1' }}>「提示词历史」</Text>
                      下拉一键复用；支持删首条、清空与搜索。
                    </p>
                    <p>
                      <Text strong style={{ color: '#8b5cf6' }}>
                        长度提示：
                      </Text>{' '}
                      输入标题右侧会显示
                      <Text style={{ color: '#6366f1' }}>「（当前长度 / 最大长度）」</Text>
                      ，并按占比自动变色（紫/橙/红）；悬浮可查看说明。
                    </p>
                  </div>
                ),
              },
              {
                title: '第三步：解析提示词',
                description: (
                  <div style={{ color: '#666', marginBottom: 8 }}>
                    <p>
                      点击<Text style={{ color: '#6366f1', fontWeight: 500 }}>「开始解析」</Text>
                      按钮，系统会识别出角色和场景
                    </p>
                  </div>
                ),
              },
              {
                title: '第四步：绑定参考图（可选）',
                description: (
                  <div style={{ color: '#666', marginBottom: 8 }}>
                    <p>
                      如果提示词中有 <Text style={{ color: '#ef4444' }}>@角色名</Text>
                      ，系统会提示你上传该角色的图片作为参考
                    </p>
                    <p>
                      点击<Text style={{ color: '#6366f1' }}>「绑定参考图」</Text>→ 选择或上传图片 →
                      选择类型（<Text style={{ color: '#10b981' }}>人物</Text>/
                      <Text style={{ color: '#10b981' }}>人脸</Text>/
                      <Text style={{ color: '#10b981' }}>全身</Text>/
                      <Text style={{ color: '#10b981' }}>场景</Text>）→ 点击
                      <Text style={{ color: '#6366f1' }}>「确认绑定」</Text>
                    </p>
                    <p>
                      <Text strong style={{ color: '#f59e0b' }}>
                        从图库选择：
                      </Text>{' '}
                      点击<Text style={{ color: '#6366f1' }}>「从图库选择」</Text>
                      可以挑选之前已保存的参考图
                    </p>
                  </div>
                ),
              },
              {
                title: '第五步：管理参考图',
                description: (
                  <div style={{ color: '#666', marginBottom: 8 }}>
                    <p>
                      点击导航栏<Text style={{ color: '#6366f1' }}>「参考图库」</Text>按钮可以：
                    </p>
                    <ul style={{ paddingLeft: 20, margin: '4px 0' }}>
                      <li>按树形目录查看图片：全部图片 / 未分类(根目录) / 自定义文件夹</li>
                      <li>创建、重命名、删除文件夹（支持新建子文件夹）</li>
                      <li>上传图片时可直接指定保存目录</li>
                      <li>将图片移动到任意文件夹进行归档</li>
                      <li>点击图片可预览完整大图</li>
                      <li>
                        按类型筛选（<Text style={{ color: '#10b981' }}>人物</Text>/
                        <Text style={{ color: '#10b981' }}>人脸</Text>/
                        <Text style={{ color: '#10b981' }}>全身</Text>/
                        <Text style={{ color: '#10b981' }}>场景</Text>）
                      </li>
                      <li>搜索参考图（按角色名或标签）</li>
                      <li>按标签筛选</li>
                      <li>为参考图添加/移除标签</li>
                      <li>删除不需要的参考图</li>
                      <li>
                        <Text strong style={{ color: '#ec4899' }}>
                          批量操作：
                        </Text>{' '}
                        点击"多选模式"按钮进入批量操作模式，可批量移动、批量删除、批量添加标签
                      </li>
                      <li>
                        <Text strong style={{ color: '#f59e0b' }}>
                          提示词模板：
                        </Text>{' '}
                        点击"模板库"按钮可创建、使用提示词模板，支持变量（如 {'{角色}'}）和次数统计
                      </li>
                    </ul>
                    <p>
                      <Text strong style={{ color: '#ef4444' }}>
                        重名提示：
                      </Text>{' '}
                      同级目录下创建或重命名为相同名称会报错，请更换名称。
                    </p>
                    <p>
                      <Text strong style={{ color: '#f59e0b' }}>
                        预设标签：
                      </Text>{' '}
                      可爱、帅气、美丽、成熟、青春、活泼、内向、冷酷，也可输入自定义标签
                    </p>
                  </div>
                ),
              },
              {
                title: '第六步：生成图片',
                description: (
                  <div style={{ color: '#666', marginBottom: 8 }}>
                    <p>
                      选择模型（<Text style={{ color: '#10b981' }}>Seedream</Text> 或{' '}
                      <Text style={{ color: '#10b981' }}>Banana 2</Text>）和图片参数
                    </p>
                    <p>
                      点击<Text style={{ color: '#6366f1', fontWeight: 500 }}>「开始生成」</Text>
                      等待图片生成完成
                    </p>
                    <p>
                      生成完成后可以点击<Text style={{ color: '#6366f1' }}>「保存到本地」</Text>
                    </p>
                  </div>
                ),
              },
              {
                title: '第七步：批量处理（可选）',
                description: (
                  <div style={{ color: '#666', marginBottom: 8 }}>
                    <p>
                      开启<Text style={{ color: '#6366f1', fontWeight: 500 }}>「批量模式」</Text>
                      可一次性生成多张图片：
                    </p>
                    <ul style={{ paddingLeft: 20, margin: '4px 0' }}>
                      <li>开启批量模式开关</li>
                      <li>配置分隔符或开启自动识别</li>
                      <li>
                        输入多个场景的提示词（用 <Text code>|</Text> 分隔）
                      </li>
                      <li>
                        点击<Text style={{ color: '#6366f1' }}>「拆分场景」</Text>拆分提示词
                      </li>
                      <li>为每个场景绑定角色参考图（可选）</li>
                      <li>
                        点击<Text style={{ color: '#6366f1' }}>「设置」</Text>调整模型和并发数
                      </li>
                      <li>
                        点击<Text style={{ color: '#6366f1', fontWeight: 500 }}>「全部生图」</Text>
                        并发生成图片
                      </li>
                    </ul>
                    <p>
                      <Text strong style={{ color: '#8b5cf6' }}>
                        全局绑定：
                      </Text>{' '}
                      批量模式下可切换<Text style={{ color: '#8b5cf6' }}>「全局绑定」</Text>
                      模式，一次绑定所有场景共享
                    </p>
                  </div>
                ),
              },
              {
                title: '第八步：单图模式生成',
                description: (
                  <div style={{ color: '#666', marginBottom: 8 }}>
                    <p>单图模式下也可批量生成所有分段图片：</p>
                    <ul style={{ paddingLeft: 20, margin: '4px 0' }}>
                      <li>
                        输入提示词并点击<Text style={{ color: '#6366f1' }}>「开始解析」</Text>
                      </li>
                      <li>
                        解析结果以<Text style={{ color: '#10b981' }}>折叠面板</Text>形式展示
                      </li>
                      <li>
                        点击<Text style={{ color: '#6366f1' }}>「生成设置」</Text>调整参数
                      </li>
                      <li>
                        点击<Text style={{ color: '#6366f1', fontWeight: 500 }}>「全部生图」</Text>
                        批量生成所有分段
                      </li>
                    </ul>
                    <p>
                      <Text strong style={{ color: '#f59e0b' }}>
                        模式切换：
                      </Text>{' '}
                      切换模式时会<Text style={{ color: '#ef4444' }}>自动清除</Text>之前的结果
                    </p>
                  </div>
                ),
              },
              {
                title: '第九步：隐藏窗口',
                description: (
                  <div style={{ color: '#666' }}>
                    <p>
                      使用完毕后，按 <Text strong>Ctrl + Shift + P</Text>{' '}
                      可以隐藏窗口（程序会在后台托盘运行）
                    </p>
                    <p>或者点击窗口右上角×关闭按钮，窗口会最小化到托盘</p>
                  </div>
                ),
              },
            ]}
          />

          <Alert
            message="📊 今日概览与历史导出"
            description={
              <div style={{ color: '#666' }}>
                <ul style={{ paddingLeft: 20, margin: '4px 0' }}>
                  <li>
                    首页顶部“今日概览”会实时显示日期时间、生成总数、成功率、失败数、最近失败。
                  </li>
                  <li>打开“生成历史记录”弹窗后，可在底部左侧使用“导出JSON / 导出MD”。</li>
                  <li>导出范围为当前筛选条件下的全部匹配记录（不只是当前页）。</li>
                </ul>
              </div>
            }
            type="info"
            showIcon
            style={{ marginTop: 12 }}
          />

          <Divider />

          <Alert
            message="💡 提示"
            description={
              <div style={{ color: '#666' }}>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  <li>托盘图标位置：屏幕右下角任务栏</li>
                  <li>右键托盘图标可选择「显示窗口」或「退出」</li>
                  <li>快捷键在电脑任何界面都有效，不用切换到窗口</li>
                </ul>
              </div>
            }
            type="info"
            showIcon
          />
        </div>
      </Modal>

      <ReferenceLibrary
        visible={referenceModalVisible}
        onClose={() => setReferenceModalVisible(false)}
        referenceImages={referenceImages}
        setReferenceImages={setReferenceImages}
        referenceLoading={referenceLoading}
        setReferenceLoading={setReferenceLoading}
        allTags={allTags}
        setAllTags={setAllTags}
        referenceSearch={referenceSearch}
        setReferenceSearch={setReferenceSearch}
        referenceFilterType={referenceFilterType}
        setReferenceFilterType={setReferenceFilterType}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        onLoadReferenceImages={loadReferenceImages}
        onLoadAllTags={loadAllTags}
        onDeleteReference={handleDeleteReference}
        addTagModalVisible={addTagModalVisible}
        setAddTagModalVisible={setAddTagModalVisible}
        addTagCharacter={addTagCharacter}
        setAddTagCharacter={setAddTagCharacter}
        newTag={newTag}
        setNewTag={setNewTag}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
      />

      <HistoryList
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        onApplyParams={handleApplyHistoryParams}
        onRegenerate={handleRegenerateHistory}
      />

      <PromptTemplateModal
        visible={templateModalVisible}
        onClose={() => setTemplateModalVisible(false)}
        onSelectTemplate={content => {
          setPrompt(content);
          setParsedResult(null);
        }}
      />
    </ConfigProvider>
  );
}

export default MainApp;
