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
  Popconfirm,
  Checkbox,
  Dropdown,
} from 'antd';
import {
  PlayCircleOutlined,
  UserOutlined,
  AppstoreOutlined,
  RobotOutlined,
  UploadOutlined,
  DeleteOutlined,
  SettingOutlined,
  DownloadOutlined,
  QuestionCircleOutlined,
  PictureOutlined,
  SearchOutlined,
  PlusOutlined,
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

function MainApp() {
  const { message } = App.useApp();
  const { resolvedTheme, setMode } = useTheme();
  const [currentPage, setCurrentPage] = useState('workspace');
  const [prompt, setPrompt] = useState('');
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
  const [concurrency, setConcurrency] = useState(2);
  const [batchGenModalVisible, setBatchGenModalVisible] = useState(false);
  const [batchGenerationMode, setBatchGenerationMode] = useState<'sequential' | 'parallel'>(
    'parallel'
  );
  const [failStrategy, setFailStrategy] = useState<'continue' | 'stop'>('continue');

  useEffect(() => {
    console.log('App loaded, checking Tauri...');
    loadApiConfig();
    loadGenerationConfig();
  }, []);

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

  const handleBatchGenerate = async () => {
    let segments = batchMode ? batchSplitResult?.segments : parsedResult?.segments;
    if (!segments || segments.length === 0) return;

    if (!batchMode && parsedResult) {
      segments = parsedResult.segments.map((seg, idx) => ({
        index: idx,
        content: seg.content,
        characters: parsedResult.characters,
      }));
    }

    setBatchGenerating(true);
    const total = segments.length;
    const initialProgress: any = {
      total,
      current: 0,
      sceneResults: (segments as any).map((seg: any) => ({
        index: seg.index,
        status: 'pending',
      })),
    };
    setBatchProgress(initialProgress);

    let width: number, height: number;
    if (selectedModel === 'seedream') {
      const [w, h] = seedreamSize.split('x').map(Number);
      width = w;
      height = h;
    } else {
      const baseResolution =
        bananaResolution === '4K' ? 4096 : bananaResolution === '2K' ? 2048 : 1024;
      const ratio = imageSize.width / imageSize.height;
      if (ratio >= 1) {
        width = baseResolution;
        height = Math.round(baseResolution / ratio);
      } else {
        height = baseResolution;
        width = Math.round(baseResolution * ratio);
      }
    }

    const concurrencyLimit = concurrency;
    const tasks = [...segments];

    const runTask = async (seg: any, idx: number) => {
      setBatchProgress((prev: any) => {
        if (!prev) return prev;
        const newResults = [...prev.sceneResults];
        newResults[idx] = { ...newResults[idx], status: 'generating' };
        return { ...prev, sceneResults: newResults };
      });

      try {
        const params: ImageGenerationParams = {
          model: selectedModel,
          prompt: seg.content,
          characterBindings: seg.characters.map((char: any) => {
            const b = characterBindings[char.name];
            return {
              character_name: char.name,
              reference_image_path: b?.referenceImagePath,
              image_type: b?.imageType || '人物',
            };
          }),
          width,
          height,
          count: 1,
          quality: imageQuality,
          watermark: selectedModel === 'seedream' ? watermark === 'true' : undefined,
        };

        const result = await api.generateImage(params);

        if (!batchMode) {
          setGenerationResult(result);
        }

        console.log(
          '[生成结果]',
          result.success ? '成功' : '失败',
          result.images?.length,
          '张图片'
        );

        // 保存到历史记录（无论成功失败都保存）
        try {
          const { addHistory } = await import('./api');
          const prompt =
            batchMode && batchSplitResult
              ? batchSplitResult.segments[idx]?.content || params.prompt
              : params.prompt;
          console.log('[保存历史记录]', {
            prompt,
            model: params.model,
            imagesCount: result.images?.length,
          });
          await addHistory({
            id: `gen_${Date.now()}`,
            prompt: prompt,
            model: params.model,
            params: params as any,
            images: result.images || [],
            characters: parsedResult?.characters?.map(c => c.name) || [],
            status: result.success ? 'completed' : 'failed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          console.log('[历史记录保存成功]');
        } catch (e) {
          console.error('[保存历史记录失败]:', e);
        }

        setBatchProgress((prev: any) => {
          if (!prev) return prev;
          const newResults = [...prev.sceneResults];
          newResults[idx] = {
            ...newResults[idx],
            status: result.success ? 'completed' : 'failed',
            result: result,
          };
          return { ...prev, current: prev.current + 1, sceneResults: newResults };
        });
      } catch (err) {
        if (!batchMode) {
          setGenerationResult({
            success: false,
            images: [],
            error: err instanceof Error ? err.message : String(err),
          });
        }
        setBatchProgress((prev: any) => {
          if (!prev) return prev;
          const newResults = [...prev.sceneResults];
          newResults[idx] = { ...newResults[idx], status: 'failed' };
          return { ...prev, current: prev.current + 1, sceneResults: newResults };
        });
      }
    };

    for (let i = 0; i < tasks.length; i += concurrencyLimit) {
      const chunk = tasks.slice(i, i + concurrencyLimit);
      await Promise.all(chunk.map((task, chunkIdx) => runTask(task, i + chunkIdx)));
    }

    setBatchGenerating(false);
    message.success('批量生成任务已完成');
  };

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

  const handleSearchReference = () => {
    loadReferenceImages();
  };

  const handleFilterTypeChange = (type: string) => {
    setReferenceFilterType(type);
    loadReferenceImages();
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

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    if (page === 'gallery') {
      openReferenceModal();
    }
    if (page === 'history') {
      setHistoryModalVisible(true);
    }
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
            <div className="main-container">
              <SlideUp delay={0.1}>
                <Card className="prompt-card" variant="borderless">
                  <div className="card-header" style={{ justifyContent: 'space-between' }}>
                    <Title level={5} className="card-title">
                      输入提示词
                    </Title>
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

                  <TextArea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder={
                      batchMode
                        ? '输入多个场景，用分隔符分开，如：场景1描述 | 场景2描述 | 场景3描述'
                        : '描述你的画面，如：在森林里@小明 正在跑步...'
                    }
                    rows={batchMode ? 6 : 4}
                    className="prompt-input"
                    maxLength={batchMode ? 2000 : 500}
                    showCount
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
                              onClick={handleBatchGenerate}
                              style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                border: 'none',
                              }}
                            >
                              {batchGenerating
                                ? `生成中 (${batchProgress?.current}/${batchProgress?.total})`
                                : '全部生图'}
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
                                                  src={api.getImageUrl(binding.referenceImagePath)}
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
                                                  binding?.referenceImagePath ? 'green' : 'default'
                                                }
                                              >
                                                {binding?.referenceImagePath ? '已绑定' : '未绑定'}
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
                                        <Title level={5} style={{ fontSize: 14, marginBottom: 12 }}>
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
                              onClick={handleBatchGenerate}
                              disabled={!parsedResult}
                              style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                border: 'none',
                              }}
                            >
                              {batchGenerating
                                ? `生成中 (${batchProgress?.current}/${batchProgress?.total})`
                                : '全部生图'}
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
                      <li>查看所有已绑定的参考图</li>
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
                    </ul>
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

      <Modal
        title="参考图管理"
        open={referenceModalVisible}
        onCancel={() => setReferenceModalVisible(false)}
        footer={null}
        width={900}
      >
        <div style={{ padding: '16px 0' }}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Input
                placeholder="搜索角色名或标签"
                prefix={<SearchOutlined />}
                value={referenceSearch}
                onChange={e => setReferenceSearch(e.target.value)}
                onPressEnter={handleSearchReference}
                allowClear
              />
            </Col>
            <Col span={8}>
              <Select
                placeholder="筛选类型"
                value={referenceFilterType}
                onChange={handleFilterTypeChange}
                style={{ width: '100%' }}
                allowClear
                options={[
                  { value: '人物', label: '人物' },
                  { value: '人脸', label: '人脸' },
                  { value: '全身', label: '全身' },
                  { value: '场景', label: '场景' },
                ]}
              />
            </Col>
            <Col span={8}>
              <Select
                mode="multiple"
                placeholder="按标签筛选"
                value={selectedTags}
                onChange={tags => {
                  setSelectedTags(tags);
                  if (tags.length === 0) {
                    setReferenceFilterType('');
                    setReferenceSearch('');
                  }
                  setTimeout(() => loadReferenceImages(), 0);
                }}
                style={{ width: '100%' }}
                allowClear
                options={[
                  { value: '可爱', label: '可爱' },
                  { value: '帅气', label: '帅气' },
                  { value: '美丽', label: '美丽' },
                  { value: '成熟', label: '成熟' },
                  { value: '青春', label: '青春' },
                  { value: '活泼', label: '活泼' },
                  { value: '内向', label: '内向' },
                  { value: '冷酷', label: '冷酷' },
                  ...allTags
                    .filter(
                      t =>
                        !['可爱', '帅气', '美丽', '成熟', '青春', '活泼', '内向', '冷酷'].includes(
                          t
                        )
                    )
                    .map(t => ({ value: t, label: t })),
                ]}
              />
            </Col>
          </Row>

          <Spin spinning={referenceLoading}>
            {referenceImages.length > 0 ? (
              <List
                grid={{ gutter: 16, column: 3 }}
                dataSource={referenceImages}
                renderItem={item => (
                  <List.Item>
                    <Card
                      hoverable
                      cover={
                        <div
                          style={{ height: 150, overflow: 'hidden', borderRadius: '4px 4px 0 0' }}
                        >
                          <Image
                            src={api.getImageUrl(item.referenceImagePath || '')}
                            alt={item.characterName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                          />
                        </div>
                      }
                      actions={[
                        <a
                          key="addTag"
                          onClick={() => {
                            setAddTagCharacter(item.characterName);
                            setNewTag('');
                            setAddTagModalVisible(true);
                          }}
                          style={{ color: '#1890ff', cursor: 'pointer' }}
                        >
                          <PlusOutlined /> 添加标签
                        </a>,
                        <Popconfirm
                          title="确认删除"
                          description="确定要删除这个参考图吗？"
                          onConfirm={() => handleDeleteReference(item.characterName)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <DeleteOutlined key="delete" style={{ color: '#ff4d4f' }} />
                        </Popconfirm>,
                      ]}
                    >
                      <Card.Meta
                        title={<>@{item.characterName}</>}
                        description={
                          <div>
                            <Tag color={item.imageType === '人物' ? 'blue' : 'green'}>
                              {item.imageType}
                            </Tag>
                            <div style={{ marginTop: 8 }}>
                              {item.tags && item.tags.length > 0 ? (
                                <>
                                  {item.tags.map(tag => (
                                    <Tag
                                      key={tag}
                                      closable
                                      onClose={() => handleRemoveTag(item.characterName, tag)}
                                      style={{ marginBottom: 4 }}
                                    >
                                      {tag}
                                    </Tag>
                                  ))}
                                </>
                              ) : (
                                <Text type="secondary">暂无标签</Text>
                              )}
                            </div>
                          </div>
                        }
                      />
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无参考图" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Spin>

          {referenceImages.length > 0 && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Text type="secondary">共 {referenceImages.length} 张参考图</Text>
            </div>
          )}

          <Modal
            title="添加标签"
            open={addTagModalVisible}
            onCancel={() => setAddTagModalVisible(false)}
            onOk={handleAddTag}
            okText="添加"
          >
            <p>为 @{addTagCharacter} 添加标签：</p>
            <Select
              mode="tags"
              placeholder="输入或选择标签"
              value={newTag ? [newTag] : []}
              onChange={vals => setNewTag(vals[vals.length - 1] || '')}
              style={{ width: '100%' }}
              options={[
                { value: '可爱', label: '可爱' },
                { value: '帅气', label: '帅气' },
                { value: '美丽', label: '美丽' },
                { value: '成熟', label: '成熟' },
                { value: '青春', label: '青春' },
                { value: '活泼', label: '活泼' },
                { value: '内向', label: '内向' },
                { value: '冷酷', label: '冷酷' },
                ...allTags
                  .filter(
                    t =>
                      !['可爱', '帅气', '美丽', '成熟', '青春', '活泼', '内向', '冷酷'].includes(t)
                  )
                  .map(t => ({ value: t, label: t })),
              ]}
            />
          </Modal>
        </div>
      </Modal>

      <HistoryList visible={historyModalVisible} onClose={() => setHistoryModalVisible(false)} />
    </ConfigProvider>
  );
}

export default MainApp;
