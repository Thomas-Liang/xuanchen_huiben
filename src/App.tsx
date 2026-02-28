import { useState, useRef, useEffect } from 'react';
import { App } from 'antd';
import {
  ConfigProvider,
  Layout,
  Input,
  Button,
  Card,
  Typography,
  Space,
  Tag,
  Empty,
  Spin,
  Modal,
  Radio,
  Tabs,
  List,
  Image,
  Select,
  Progress,
  Row,
  Col,
  Divider,
  Alert,
  Steps,
  Popconfirm,
} from 'antd';
import {
  PlayCircleOutlined,
  UserOutlined,
  AppstoreOutlined,
  RobotOutlined,
  UploadOutlined,
  DeleteOutlined,
  CheckCircleFilled,
  SettingOutlined,
  DownloadOutlined,
  QuestionCircleOutlined,
  PictureOutlined,
  SearchOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type {
  ParsedPrompt,
  CharacterBinding,
  ImageGenerationParams,
  ImageGenerationResult,
  APIConfig,
  GenerationConfig,
} from './types';
import * as api from './api';
import type { ReferenceImageQuery } from './api';
import './App.css';

const { Header, Content } = Layout;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

const themeConfig = {
  token: {
    colorPrimary: '#6366f1',
    borderRadius: 12,
    fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif",
  },
};

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
  const [prompt, setPrompt] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedPrompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [bindingModalVisible, setBindingModalVisible] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [imageType, setImageType] = useState<'人物' | '场景'>('人物');
  const [bindingLoading, setBindingLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('upload');
  const [referenceImageLibrary, setReferenceImageLibrary] = useState<CharacterBinding[]>([]);
  const dragCounter = useRef(0);

  const [selectedModel, setSelectedModel] = useState<'seedream' | 'banana_pro'>('seedream');
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({
    width: 1,
    height: 1,
  });
  const [bananaResolution, setBananaResolution] = useState<string>('1K');
  const [imageCount, setImageCount] = useState(1);
  const [imageQuality, setImageQuality] = useState<'standard' | 'high' | 'ultra'>('standard');
  const [seedreamSize, setSeedreamSize] = useState<string>('1024x1024');
  const [sequentialImageGeneration, setSequentialImageGeneration] = useState<'auto' | 'disabled'>(
    'disabled'
  );
  const [responseFormat, setResponseFormat] = useState<'url' | 'b64_json'>('url');
  const [watermark, setWatermark] = useState<string>('false');
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationResult, setGenerationResult] = useState<ImageGenerationResult | null>(null);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [referenceModalVisible, setReferenceModalVisible] = useState(false);
  const [referenceImages, setReferenceImages] = useState<CharacterBinding[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [referenceFilterType, setReferenceFilterType] = useState<string>('');
  const [referenceSearch, setReferenceSearch] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [characterBindings, setCharacterBindings] = useState<Record<string, CharacterBinding>>({});
  const [apiConfig, setApiConfig] = useState<APIConfig>({
    seedream: { baseUrl: '', apiKey: '' },
    bananaPro: { baseUrl: '', apiKey: '' },
  });
  const [testingApi, setTestingApi] = useState<'seedream' | 'banana_pro' | null>(null);

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
      console.error('加载API配置失败:', error);
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

      setImageCount(config.count);
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

  const openBindingModal = async (characterName: string) => {
    setSelectedCharacter(characterName);
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
    if (!selectedCharacter) {
      message.warning('请选择角色');
      return;
    }

    if (!uploadedImage) {
      message.warning('请上传参考图');
      return;
    }

    setBindingLoading(true);
    try {
      let binding;
      if (uploadedImage.startsWith('data:')) {
        const base64Data = uploadedImage.split(',')[1];
        binding = await api.saveReferenceImage(selectedCharacter, base64Data, imageType);
      } else {
        binding = await api.bindCharacterReference(selectedCharacter, uploadedImage, imageType);
      }

      setCharacterBindings(prev => ({
        ...prev,
        [selectedCharacter]: {
          characterName: binding.characterName,
          referenceImagePath: binding.referenceImagePath,
          imageType: binding.imageType,
          createdAt: binding.createdAt,
          bound: true,
        },
      }));

      if (parsedResult) {
        const updatedCharacters = parsedResult.characters.map(c =>
          c.name === selectedCharacter ? { ...c, bound: true } : c
        );
        setParsedResult({ ...parsedResult, characters: updatedCharacters });
      }

      message.success(`角色 @${selectedCharacter} 绑定成功`);
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

  const handleGenerate = async () => {
    if (!parsedResult) {
      message.warning('请先解析提示词');
      return;
    }

    setGenerating(true);
    setGenerationProgress(0);
    setGenerationResult(null);

    try {
      let width: number, height: number;

      if (selectedModel === 'seedream') {
        const [w, h] = seedreamSize.split('x').map(Number);
        width = w;
        height = h;
      } else {
        // banana_pro uses aspect ratio and resolution
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

      const params: ImageGenerationParams = {
        model: selectedModel,
        prompt: parsedResult.original,
        characterBindings: Object.values(characterBindings).map(b => ({
          character_name: b.characterName,
          reference_image_path: b.referenceImagePath,
          image_type: b.imageType,
        })),
        width,
        height,
        count: imageCount,
        quality: imageQuality,
        watermark: selectedModel === 'seedream' ? watermark === 'true' : undefined,
      };

      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      const result = await api.generateImage(params);

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationResult(result);

      if (result.success) {
        message.success('图片生成成功！');
      } else {
        message.error(`生成失败: ${result.error}`);
      }
    } catch (error) {
      message.error(`生成失败: ${error}`);
    } finally {
      setGenerating(false);
    }
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
      message.success(`${model === 'seedream' ? 'Seeddream' : 'Banana Pro'} API连接成功`);
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

  const handleAddTag = async (characterName: string) => {
    if (!newTag.trim()) {
      message.warning('请输入标签');
      return;
    }
    try {
      await api.addTagToReference(characterName, newTag.trim());
      message.success('标签添加成功');
      setNewTag('');
      setEditingTag(null);
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

  const handleSaveGenerationConfig = async () => {
    try {
      let width: number, height: number;

      if (selectedModel === 'seedream') {
        const [w, h] = seedreamSize.split('x').map(Number);
        width = w;
        height = h;
      } else {
        width = imageSize.width;
        height = imageSize.height;
      }

      const config: GenerationConfig = {
        model: selectedModel,
        width,
        height,
        count: imageCount,
        quality: imageQuality,
        size: selectedModel === 'seedream' ? seedreamSize : bananaResolution,
        sequential_image_generation:
          selectedModel === 'seedream' ? sequentialImageGeneration : undefined,
        response_format: selectedModel === 'seedream' ? responseFormat : undefined,
        watermark: selectedModel === 'seedream' ? watermark === 'true' : false,
      };
      await api.saveGenerationConfig(config);
      message.success('生成参数配置已保存为默认');
    } catch (error) {
      message.error(`保存失败: ${error}`);
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

  return (
    <ConfigProvider theme={themeConfig}>
      <Layout className="app-layout">
        <div className="header-bg" />
        <Header className="app-header">
          <div className="header-content">
            <RobotOutlined className="header-icon" />
            <Title level={4} className="header-title">
              泫晨懿然·灵犀绘梦助手
            </Title>
          </div>
          <Space>
            <Button
              type="text"
              icon={<PictureOutlined />}
              onClick={openReferenceModal}
              style={{ color: '#fff' }}
            >
              参考图管理
            </Button>
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              onClick={() => setHelpModalVisible(true)}
              style={{ color: '#fff' }}
            >
              使用说明
            </Button>
          </Space>
        </Header>
        <Content className="app-content">
          <div className="main-container">
            <Card className="prompt-card" variant="borderless">
              <div className="card-header">
                <Title level={5} className="card-title">
                  输入提示词
                </Title>
                <Text type="secondary">使用 @角色名 绑定参考图</Text>
              </div>
              <TextArea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="描述你的画面，如：在森林里@小明 正在跑步..."
                rows={4}
                className="prompt-input"
                maxLength={500}
                showCount
              />
              <div className="prompt-actions">
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
              </div>
              <div className="example-prompts">
                <Text type="secondary" className="example-label">
                  试试看：
                </Text>
                <Space wrap>
                  {examplePrompts.map((example, idx) => (
                    <Tag key={idx} className="example-tag" onClick={() => setPrompt(example)}>
                      {example.slice(0, 20)}...
                    </Tag>
                  ))}
                </Space>
              </div>
            </Card>

            <Spin spinning={loading}>
              {parsedResult ? (
                <div className="results-container">
                  <Card className="result-card original-card" variant="borderless">
                    <div className="card-header">
                      <Title level={5} className="card-title">
                        原始提示词
                      </Title>
                    </div>
                    <Paragraph className="original-text" copyable>
                      {parsedResult.original}
                    </Paragraph>
                  </Card>

                  <div className="results-grid">
                    {parsedResult.characters.length > 0 && (
                      <Card className="result-card" variant="borderless">
                        <div className="card-header">
                          <UserOutlined />
                          <Title level={5} className="card-title">
                            角色
                          </Title>
                          <Tag color="blue">{parsedResult.characters.length}</Tag>
                        </div>
                        <div className="character-list">
                          {parsedResult.characters.map((char, idx) => {
                            const binding = characterBindings[char.name];
                            return (
                              <div key={idx} className="character-item">
                                <div className="character-avatar">
                                  {binding?.referenceImagePath &&
                                  binding.referenceImagePath.trim() !== '' ? (
                                    <img
                                      src={api.getImageUrl(binding.referenceImagePath || '')}
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
                                    color={char.bound ? 'green' : 'default'}
                                    className="bind-tag"
                                    icon={char.bound ? <CheckCircleFilled /> : null}
                                  >
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
                                      绑定参考图
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}

                    {parsedResult.segments.length > 0 && (
                      <Card className="result-card" variant="borderless">
                        <div className="card-header">
                          <AppstoreOutlined />
                          <Title level={5} className="card-title">
                            内容分段
                          </Title>
                          <Tag color="purple">{parsedResult.segments.length}</Tag>
                        </div>
                        <div className="segment-list">
                          {parsedResult.segments.map((seg, idx) => {
                            const tagInfo = segmentTags[seg.type] || segmentTags.other;
                            return (
                              <div key={idx} className="segment-item">
                                <Tag
                                  color={tagInfo.color}
                                  icon={tagInfo.icon}
                                  className="segment-tag"
                                >
                                  {seg.type}
                                </Tag>
                                <Text className="segment-content">{seg.content}</Text>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}
                  </div>

                  {parsedResult.characters.length === 0 && parsedResult.segments.length === 0 && (
                    <Card className="result-card" variant="borderless">
                      <Empty
                        description="未检测到角色或分段"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    </Card>
                  )}

                  <Card className="result-card generate-card" variant="borderless">
                    <div className="card-header">
                      <RobotOutlined />
                      <Title level={5} className="card-title">
                        AI生成
                      </Title>
                      <Button
                        size="small"
                        icon={<SettingOutlined />}
                        onClick={() => setConfigModalVisible(true)}
                        style={{ marginLeft: 'auto' }}
                      >
                        API配置
                      </Button>
                    </div>

                    <div className="generate-settings">
                      <Row gutter={16}>
                        <Col span={8}>
                          <Text strong>选择模型：</Text>
                          <Select
                            value={selectedModel}
                            onChange={setSelectedModel}
                            style={{ width: '100%', marginTop: 4 }}
                            options={[
                              { value: 'seedream', label: 'Seeddream 4.5' },
                              { value: 'banana_pro', label: 'Banana Pro' },
                            ]}
                          />
                        </Col>
                        {selectedModel === 'seedream' ? (
                          <>
                            <Col span={8}>
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
                            <Col span={8}>
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
                            <Col span={8}>
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
                            <Col span={8}>
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
                          </>
                        ) : (
                          <>
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
                            <Col span={12}>
                              <Text strong>生成数量：</Text>
                              <Select
                                value={imageCount}
                                onChange={setImageCount}
                                style={{ width: '100%', marginTop: 4 }}
                                options={[
                                  { value: 1, label: '1张' },
                                  { value: 2, label: '2张' },
                                  { value: 4, label: '4张' },
                                ]}
                              />
                            </Col>
                          </>
                        )}
                      </Row>

                      <div style={{ marginTop: 12, textAlign: 'right' }}>
                        <Button
                          size="small"
                          icon={<SettingOutlined />}
                          onClick={handleSaveGenerationConfig}
                        >
                          保存为默认配置
                        </Button>
                      </div>

                      <Divider style={{ margin: '16px 0' }} />

                      <div className="generate-actions">
                        <Button
                          type="primary"
                          size="large"
                          icon={<RobotOutlined />}
                          onClick={handleGenerate}
                          loading={generating}
                          disabled={!parsedResult}
                        >
                          {generating ? '生成中...' : '开始生成'}
                        </Button>

                        {generating && (
                          <Progress
                            percent={generationProgress}
                            status="active"
                            style={{ marginLeft: 16, width: 200 }}
                          />
                        )}
                      </div>
                    </div>
                  </Card>

                  {generationResult && (
                    <Card className="result-card" variant="borderless">
                      <div className="card-header">
                        <Title level={5} className="card-title">
                          生成结果
                        </Title>
                        {generationResult.success && <Tag color="green">成功</Tag>}
                        {!generationResult.success && <Tag color="red">失败</Tag>}
                      </div>

                      {generationResult.success ? (
                        <Row gutter={16}>
                          {generationResult.images.map((img, idx) => (
                            <Col key={idx} span={12}>
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
                    </Card>
                  )}
                </div>
              ) : (
                !loading && (
                  <Card className="result-card empty-card" variant="borderless">
                    <Empty
                      description="输入提示词并点击解析开始"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  </Card>
                )
              )}
            </Spin>
          </div>
        </Content>
      </Layout>

      <Modal
        title={`绑定角色 @${selectedCharacter} 的参考图`}
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

          <Divider>Banana Pro API</Divider>
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
          <Steps
            current={0}
            direction="vertical"
            items={[
              {
                title: '第一步：召唤出窗口',
                description: (
                  <div style={{ color: '#666', marginBottom: 8 }}>
                    <p>
                      如果看不见窗口，按 <Text strong>Ctrl + Shift + P</Text>{' '}
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
                      <Text strong>绑定角色：</Text> 在角色名字前加 <Text code>@</Text> 符号，例如：
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
                    <p>点击「开始解析」按钮，系统会识别出角色和场景</p>
                  </div>
                ),
              },
              {
                title: '第四步：绑定参考图（可选）',
                description: (
                  <div style={{ color: '#666', marginBottom: 8 }}>
                    <p>如果提示词中有 @角色名，系统会提示你上传该角色的图片作为参考</p>
                    <p>
                      点击「绑定参考图」→ 选择或上传图片 → 选择类型（人物/场景）→ 点击「确认绑定」
                    </p>
                    <p>
                      <Text strong>从图库选择：</Text> 点击「从图库选择」可以挑选之前已保存的参考图
                    </p>
                  </div>
                ),
              },
              {
                title: '第五步：管理参考图',
                description: (
                  <div style={{ color: '#666', marginBottom: 8 }}>
                    <p>点击导航栏「参考图管理」按钮可以：</p>
                    <ul style={{ paddingLeft: 20, margin: '4px 0' }}>
                      <li>查看所有已绑定的参考图</li>
                      <li>按类型筛选（人物/场景）</li>
                      <li>搜索参考图（按角色名或标签）</li>
                      <li>为参考图添加/移除标签</li>
                      <li>删除不需要的参考图</li>
                    </ul>
                  </div>
                ),
              },
              {
                title: '第六步：生成图片',
                description: (
                  <div style={{ color: '#666', marginBottom: 8 }}>
                    <p>选择模型（Seedream 或 Banana Pro）和图片尺寸</p>
                    <p>点击「开始生成」等待图片生成完成</p>
                    <p>生成完成后可以点击「保存到本地」</p>
                  </div>
                ),
              },
              {
                title: '第七步：隐藏窗口',
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
                  setTimeout(() => loadReferenceImages(), 0);
                }}
                style={{ width: '100%' }}
                allowClear
                options={allTags.map(tag => ({ value: tag, label: tag }))}
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
                                  {editingTag === item.characterName ? (
                                    <Input
                                      size="small"
                                      style={{ width: 80 }}
                                      value={newTag}
                                      onChange={e => setNewTag(e.target.value)}
                                      onPressEnter={() => handleAddTag(item.characterName)}
                                      onBlur={() => handleAddTag(item.characterName)}
                                      autoFocus
                                    />
                                  ) : (
                                    <Tag
                                      icon={<PlusOutlined />}
                                      style={{ cursor: 'pointer', marginBottom: 4 }}
                                      onClick={() => {
                                        setEditingTag(item.characterName);
                                        setNewTag('');
                                      }}
                                    >
                                      添加标签
                                    </Tag>
                                  )}
                                </>
                              ) : (
                                <Tag
                                  icon={<PlusOutlined />}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => {
                                    setEditingTag(item.characterName);
                                    setNewTag('');
                                  }}
                                >
                                  添加标签
                                </Tag>
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
        </div>
      </Modal>
    </ConfigProvider>
  );
}

export default MainApp;
