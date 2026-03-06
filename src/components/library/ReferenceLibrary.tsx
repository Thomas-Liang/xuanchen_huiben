import { useEffect, useState } from 'react';
import {
  Modal,
  Input,
  Select,
  Flex,
  Grid,
  List,
  Card,
  Image,
  Tag,
  Spin,
  Typography,
  Popconfirm,
  Tree,
  TreeSelect,
  Button,
  message,
  Radio,
  Space,
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  PlusOutlined,
  FolderOutlined,
  UploadOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { CharacterBinding } from '../../types';
import * as api from '../../api';
import type { Folder } from '../../api';

const { Text } = Typography;
const { useBreakpoint } = Grid;

interface ReferenceLibraryProps {
  visible: boolean;
  onClose: () => void;
  referenceImages: CharacterBinding[];
  setReferenceImages: (images: CharacterBinding[]) => void;
  referenceLoading: boolean;
  setReferenceLoading: (loading: boolean) => void;
  allTags: string[];
  setAllTags: (tags: string[]) => void;
  referenceSearch: string;
  setReferenceSearch: (search: string) => void;
  referenceFilterType: string;
  setReferenceFilterType: (type: string) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  onLoadReferenceImages: () => Promise<void>;
  onLoadAllTags: () => Promise<void>;
  onDeleteReference: (characterName: string) => Promise<void>;
  addTagModalVisible: boolean;
  setAddTagModalVisible: (visible: boolean) => void;
  addTagCharacter: string;
  setAddTagCharacter: (name: string) => void;
  newTag: string;
  setNewTag: (tag: string) => void;
  onAddTag: () => Promise<void>;
  onRemoveTag: (characterName: string, tag: string) => Promise<void>;
}

const presetTags = ['可爱', '帅气', '美丽', '成熟', '青春', '活泼', '内向', '冷酷'];

export function ReferenceLibrary({
  visible,
  onClose,
  referenceImages,
  setReferenceImages,
  referenceLoading,
  allTags,
  referenceSearch,
  setReferenceSearch,
  referenceFilterType,
  setReferenceFilterType,
  selectedTags,
  setSelectedTags,
  onLoadReferenceImages,
  onDeleteReference,
  addTagModalVisible,
  setAddTagModalVisible,
  addTagCharacter,
  setAddTagCharacter,
  newTag,
  setNewTag,
  onAddTag,
  onRemoveTag,
}: ReferenceLibraryProps) {
  const screens = useBreakpoint();
  const isWideToolbar = Boolean(screens.xl);
  const isNarrowToolbar = !isWideToolbar;

  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderLoading, setFolderLoading] = useState(false);
  const [newFolderModalVisible, setNewFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [renameFolderModalVisible, setRenameFolderModalVisible] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string>('');
  const [renameFolderName, setRenameFolderName] = useState('');
  const [moveImageModalVisible, setMoveImageModalVisible] = useState(false);
  const [moveImageCharacterName, setMoveImageCharacterName] = useState('');

  // 上传相关状态
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadCharacterName, setUploadCharacterName] = useState('');
  const [uploadImageType, setUploadImageType] = useState('人物');
  const [uploadedImage, setUploadedImage] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      onLoadReferenceImages();
      loadFolders();
    }
  }, [visible]);

  const loadFolders = async () => {
    setFolderLoading(true);
    try {
      const tree = await api.getFolderTree();
      setFolders(tree);
    } catch (error) {
      console.error('加载文件夹失败:', error);
    } finally {
      setFolderLoading(false);
    }
  };

  const loadImagesByFolder = async (folderId: string | null) => {
    try {
      const query: Record<string, string> = {};
      if (folderId) {
        query.folderId = folderId;
      } else {
        query.folderId = '';
      }
      const images = await api.getReferenceImages(query);
      setReferenceImages(images);
    } catch (error) {
      console.error('加载图片失败:', error);
    }
  };

  const handleSelectFolder = (keys: React.Key[]) => {
    if (keys.length > 0) {
      const folderId = keys[0] as string;
      if (folderId === 'all') {
        setSelectedFolderId(null);
        onLoadReferenceImages();
      } else if (folderId === 'root') {
        setSelectedFolderId('root');
        loadImagesByFolder(null); // 加载未分类图片
      } else {
        setSelectedFolderId(folderId);
        loadImagesByFolder(folderId);
      }
    } else {
      setSelectedFolderId(null);
      onLoadReferenceImages();
    }
  };

  const handleCreateFolder = async () => {
    const normalizedName = newFolderName.trim();
    if (!normalizedName) return;
    const duplicated = folders.some(
      f =>
        (f.parentId || null) === (newFolderParentId || null) &&
        f.name.trim().toLowerCase() === normalizedName.toLowerCase()
    );
    if (duplicated) {
      message.error('同级目录下已存在同名文件夹');
      return;
    }
    try {
      await api.createFolder(normalizedName, newFolderParentId || undefined);
      setNewFolderModalVisible(false);
      setNewFolderName('');
      setNewFolderParentId(null);
      loadFolders();
      message.success('文件夹创建成功');
    } catch (error) {
      console.error('创建文件夹失败:', error);
      message.error(`创建文件夹失败: ${error}`);
    }
  };

  const handleRenameFolder = async () => {
    const normalizedName = renameFolderName.trim();
    if (!normalizedName) return;
    const currentFolder = folders.find(f => f.id === renameFolderId);
    const duplicated = folders.some(
      f =>
        f.id !== renameFolderId &&
        (f.parentId || null) === (currentFolder?.parentId || null) &&
        f.name.trim().toLowerCase() === normalizedName.toLowerCase()
    );
    if (duplicated) {
      message.error('同级目录下已存在同名文件夹');
      return;
    }
    try {
      await api.renameFolder(renameFolderId, normalizedName);
      setRenameFolderModalVisible(false);
      setRenameFolderName('');
      setRenameFolderId('');
      loadFolders();
      message.success('文件夹重命名成功');
    } catch (error) {
      console.error('重命名文件夹失败:', error);
      message.error(`重命名文件夹失败: ${error}`);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      await api.deleteFolder(id);
      if (selectedFolderId === id) {
        setSelectedFolderId(null);
        onLoadReferenceImages();
      }
      loadFolders();
    } catch (error) {
      console.error('删除文件夹失败:', error);
    }
  };

  const handleMoveImage = async (targetFolderId?: string) => {
    try {
      await api.moveImageToFolder(moveImageCharacterName, targetFolderId);
      setMoveImageModalVisible(false);
      setMoveImageCharacterName('');
      if (selectedFolderId === 'root') {
        loadImagesByFolder(null);
      } else if (selectedFolderId === 'all' || !selectedFolderId) {
        onLoadReferenceImages();
      } else {
        loadImagesByFolder(selectedFolderId);
      }
    } catch (error) {
      console.error('移动图片失败:', error);
      message.error(`移动图片失败: ${error}`);
    }
  };

  const buildFolderTree = (allFolders: Folder[]): any[] => {
    const rootFolders = allFolders.filter(f => !f.parentId);
    return rootFolders.map(folder => ({
      key: folder.id,
      title: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }} className="folder-tree-node">
          <span style={{ marginRight: 8 }}>{folder.name}</span>
          <Space size={0} onClick={e => e.stopPropagation()}>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setNewFolderParentId(folder.id || null);
                setNewFolderModalVisible(true);
              }}
              title="新建子文件夹"
            />
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setRenameFolderId(folder.id || '');
                setRenameFolderName(folder.name);
                setRenameFolderModalVisible(true);
              }}
              title="重命名"
            />
            <Popconfirm
              title="确认删除"
              description="确定要删除此文件夹吗？"
              onConfirm={e => {
                e?.stopPropagation();
                if (folder.id) handleDeleteFolder(folder.id);
              }}
              onCancel={e => e?.stopPropagation()}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={e => e.stopPropagation()}
                title="删除"
              />
            </Popconfirm>
          </Space>
        </div>
      ),
      icon: <FolderOutlined />,
      children: buildFolderTree(allFolders.filter(f => f.parentId === folder.id)),
    }));
  };

  const buildTreeSelectData = (allFolders: Folder[]): any[] => {
    const rootFolders = allFolders.filter(f => !f.parentId);
    return rootFolders.map(folder => ({
      value: folder.id,
      title: folder.name,
      children: buildTreeSelectData(allFolders.filter(f => f.parentId === folder.id)),
    }));
  };

  const folderTreeData = buildFolderTree(folders);
  const folderTreeSelectData = buildTreeSelectData(folders);

  useEffect(() => {
    if (visible) {
      onLoadReferenceImages();
    }
  }, [visible]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadCharacterName.trim()) {
      message.warning('请输入角色/参考图名称');
      return;
    }
    if (!uploadedImage) {
      message.warning('请选择图片');
      return;
    }
    
    setUploadLoading(true);
    try {
      if (uploadedImage.startsWith('data:')) {
        const base64Data = uploadedImage.split(',')[1];
        await api.saveReferenceImage(uploadCharacterName, base64Data, uploadImageType);
      } else {
        await api.bindCharacterReference(uploadCharacterName, uploadedImage, uploadImageType);
      }

      let targetFolderId = uploadTargetFolderId;
      if (targetFolderId === null) {
        targetFolderId = selectedFolderId;
      }
      
      if (targetFolderId === 'root' || targetFolderId === 'all') {
        targetFolderId = '';
      }
      
      if (targetFolderId !== null) {
        await api.moveImageToFolder(uploadCharacterName, targetFolderId || undefined);
      }

      message.success('上传成功');
      setUploadModalVisible(false);
      setUploadCharacterName('');
      setUploadedImage('');
      setUploadTargetFolderId(null);
      
      if (selectedFolderId === 'root') {
        loadImagesByFolder(null);
      } else if (selectedFolderId === 'all' || !selectedFolderId) {
        onLoadReferenceImages();
      } else {
        loadImagesByFolder(selectedFolderId);
      }
    } catch (error) {
      console.error('上传失败:', error);
      message.error(`上传失败: ${error}`);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSearchReference = () => {
    onLoadReferenceImages();
  };

  const handleFilterTypeChange = (type: string) => {
    setReferenceFilterType(type);
    onLoadReferenceImages();
  };

  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
    if (tags.length === 0) {
      setReferenceFilterType('');
      setReferenceSearch('');
    }
    setTimeout(() => onLoadReferenceImages(), 0);
  };

  const tagOptions = [...presetTags, ...allTags.filter(t => !presetTags.includes(t))].map(t => ({
    value: t,
    label: t,
  }));

  return (
    <>
      <Modal
        title="参考图管理"
        open={visible}
        onCancel={onClose}
        footer={null}
        width="92vw"
        style={{ maxWidth: 1360, top: 20 }}
      >
        <div className="py-4">
          <div
            style={{
              padding: 16,
              border: '1px solid #f0f0f0',
              borderRadius: 12,
              marginBottom: 18,
              background: '#fafafa',
            }}
          >
          <Flex
            wrap={isWideToolbar ? false : 'wrap'}
            gap={12}
            align={isWideToolbar ? 'center' : 'stretch'}
          >
            <div style={{ flex: 1, minWidth: isWideToolbar ? 0 : '100%' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isWideToolbar
                    ? '1.3fr minmax(180px, 0.9fr) 1.1fr'
                    : '1fr',
                  gap: 12,
                }}
              >
                <Input
                  placeholder="搜索角色名或标签"
                  prefix={<SearchOutlined />}
                  value={referenceSearch}
                  onChange={e => setReferenceSearch(e.target.value)}
                  onPressEnter={handleSearchReference}
                  allowClear
                  size="large"
                />
                <Select
                  placeholder="筛选类型"
                  value={referenceFilterType}
                  onChange={handleFilterTypeChange}
                  style={{ width: '100%' }}
                  allowClear
                  size="large"
                  options={[
                    { value: '人物', label: '人物' },
                    { value: '人脸', label: '人脸' },
                    { value: '全身', label: '全身' },
                    { value: '场景', label: '场景' },
                  ]}
                />
                <Select
                  mode="multiple"
                  placeholder="按标签筛选"
                  value={selectedTags}
                  onChange={handleTagsChange}
                  style={{ width: '100%' }}
                  allowClear
                  size="large"
                  options={tagOptions}
                />
              </div>
            </div>
            <div
              style={{
                marginLeft: isWideToolbar ? 0 : 'auto',
                width: isNarrowToolbar ? '100%' : 'auto',
                display: 'flex',
                justifyContent: isWideToolbar ? 'flex-end' : 'flex-start',
                flexShrink: 0,
              }}
            >
              <Space size={12}>
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={() => setUploadModalVisible(true)}
                  size="large"
                >
                  上传图片
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setNewFolderParentId(null);
                    setNewFolderModalVisible(true);
                  }}
                  size="large"
                >
                  新建文件夹
                </Button>
              </Space>
            </div>
          </Flex>
          </div>

          <Flex gap={16} align="start">
            <div
              style={{
                width: 260,
                minWidth: 240,
                borderRight: '1px solid #f0f0f0',
                paddingRight: 12,
                minHeight: 400,
                maxHeight: '70vh',
                overflow: 'auto',
              }}
            >
                <Spin spinning={folderLoading}>
                  <Tree
                    blockNode
                    showIcon
                    defaultExpandAll
                    treeData={[
                      {
                        key: 'all',
                        title: '全部图片',
                        icon: <FolderOutlined />,
                      },
                      {
                        key: 'root',
                        title: '未分类 (根目录)',
                        icon: <FolderOutlined />,
                      },
                      ...folderTreeData,
                    ]}
                    onSelect={handleSelectFolder}
                    selectedKeys={selectedFolderId === 'root' ? ['root'] : (selectedFolderId ? [selectedFolderId] : ['all'])}
                  />
                </Spin>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Spin spinning={referenceLoading}>
                {referenceImages.length > 0 ? (
                  <List
                    grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
                    dataSource={referenceImages}
                    renderItem={item => (
                      <List.Item>
                        <Card
                          hoverable
                          cover={
                            <div className="h-36 overflow-hidden rounded-t-lg">
                              <Image
                                src={api.getImageUrl(item.referenceImagePath || '')}
                                alt={item.characterName}
                                wrapperStyle={{ width: '100%', height: '100%' }}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                preview={{ mask: '点击预览' }}
                              />
                            </div>
                          }
                          actions={[
                            <a
                              key="move"
                              onClick={() => {
                                setMoveImageCharacterName(item.characterName);
                                setMoveImageModalVisible(true);
                              }}
                              className="text-blue-500 cursor-pointer"
                            >
                              <FolderOutlined /> 移动
                            </a>,
                            <a
                              key="addTag"
                              onClick={() => {
                                setAddTagCharacter(item.characterName);
                                setNewTag('');
                                setAddTagModalVisible(true);
                              }}
                              className="text-blue-500 cursor-pointer"
                            >
                              <PlusOutlined /> 标签
                            </a>,
                            <Popconfirm
                              key="delete"
                              title="确认删除"
                              description="确定要删除这个参考图吗？"
                              onConfirm={() => onDeleteReference(item.characterName)}
                              okText="确定"
                              cancelText="取消"
                            >
                              <DeleteOutlined className="text-red-500" />
                            </Popconfirm>,
                          ]}
                        >
                          <Card.Meta
                            title={<span>@{item.characterName}</span>}
                            description={
                              <div>
                                <Tag color={item.imageType === '人物' ? 'blue' : 'green'}>
                                  {item.imageType}
                                </Tag>
                                <div className="mt-2">
                                  {item.tags && item.tags.length > 0 ? (
                                    <>
                                      {item.tags.map(tag => (
                                        <Tag
                                          key={tag}
                                          closable
                                          onClose={() => onRemoveTag(item.characterName, tag)}
                                          className="mb-1"
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
                  <div className="text-center py-12 text-gray-400">暂无参考图</div>
                )}
              </Spin>

              {referenceImages.length > 0 && (
                <div className="mt-4 text-center">
                  <Text type="secondary">共 {referenceImages.length} 张参考图</Text>
                </div>
              )}
            </div>
          </Flex>
        </div>
      </Modal>

      <Modal
        title="添加标签"
        open={addTagModalVisible}
        onCancel={() => setAddTagModalVisible(false)}
        onOk={onAddTag}
        okText="添加"
      >
        <p>为 @{addTagCharacter} 添加标签：</p>
        <Select
          mode="tags"
          placeholder="输入或选择标签"
          value={newTag ? [newTag] : []}
          onChange={vals => setNewTag(vals[vals.length - 1] || '')}
          className="w-full"
          options={tagOptions}
        />
      </Modal>

      <Modal
        title="新建文件夹"
        open={newFolderModalVisible}
        onCancel={() => {
          setNewFolderModalVisible(false);
          setNewFolderName('');
          setNewFolderParentId(null);
        }}
        onOk={handleCreateFolder}
        okText="创建"
      >
        <Input
          placeholder="文件夹名称"
          value={newFolderName}
          onChange={e => setNewFolderName(e.target.value)}
          onPressEnter={handleCreateFolder}
        />
      </Modal>

      <Modal
        title="重命名文件夹"
        open={renameFolderModalVisible}
        onCancel={() => {
          setRenameFolderModalVisible(false);
          setRenameFolderName('');
          setRenameFolderId('');
        }}
        onOk={handleRenameFolder}
        okText="保存"
      >
        <Input
          placeholder="文件夹名称"
          value={renameFolderName}
          onChange={e => setRenameFolderName(e.target.value)}
          onPressEnter={handleRenameFolder}
        />
      </Modal>

      <Modal
        title="移动图片到文件夹"
        open={moveImageModalVisible}
        onCancel={() => {
          setMoveImageModalVisible(false);
          setMoveImageCharacterName('');
        }}
        footer={null}
      >
        <List
          bordered
          dataSource={[{ id: '', name: '未分类 (根目录)', parentId: null }, ...folders]}
          renderItem={item => (
            <List.Item
              style={{ cursor: 'pointer' }}
              onClick={() => handleMoveImage(item.id || undefined)}
            >
              <FolderOutlined /> {item.name}
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        title="上传参考图"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          setUploadCharacterName('');
          setUploadedImage('');
          setUploadTargetFolderId(null);
        }}
        onOk={handleUploadSubmit}
        confirmLoading={uploadLoading}
        okText="确认上传"
        cancelText="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <div>
            <Text strong>角色/参考图名称：</Text>
            <Input
              style={{ marginTop: 8 }}
              placeholder="请输入名称 (必填)"
              value={uploadCharacterName}
              onChange={e => setUploadCharacterName(e.target.value)}
            />
          </div>
          <div>
            <Text strong>保存至文件夹：</Text>
            <div style={{ marginTop: 8 }}>
              <TreeSelect
                style={{ width: '100%' }}
                value={uploadTargetFolderId !== null ? uploadTargetFolderId : (selectedFolderId === 'all' || selectedFolderId === 'root' ? '' : (selectedFolderId || ''))}
                dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                treeData={[{ value: '', title: '未分类 (根目录)' }, ...folderTreeSelectData]}
                placeholder="请选择保存的文件夹（默认未分类）"
                treeDefaultExpandAll
                onChange={(newValue) => setUploadTargetFolderId(newValue === undefined || newValue === null ? '' : newValue)}
                allowClear
              />
            </div>
          </div>
          <div>
            <Text strong>参考图类型：</Text>
            <div style={{ marginTop: 8 }}>
              <Radio.Group
                value={uploadImageType}
                onChange={e => setUploadImageType(e.target.value)}
              >
                <Radio value="人物">人物</Radio>
                <Radio value="人脸">人脸</Radio>
                <Radio value="全身">全身</Radio>
                <Radio value="场景">场景</Radio>
              </Radio.Group>
            </div>
          </div>
          <div>
            <Text strong>选择图片：</Text>
            <div style={{ marginTop: 8 }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="library-image-upload"
              />
              <label htmlFor="library-image-upload">
                <div
                  style={{
                    border: '1px dashed #d9d9d9',
                    borderRadius: 8,
                    padding: '20px 0',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: uploadedImage ? '#f5f5f5' : '#fafafa',
                  }}
                >
                  {uploadedImage ? (
                    <img
                      src={uploadedImage}
                      alt="preview"
                      style={{ maxHeight: 200, maxWidth: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div>
                      <UploadOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
                      <p style={{ margin: 0, color: '#666' }}>点击选择图片文件</p>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default ReferenceLibrary;
