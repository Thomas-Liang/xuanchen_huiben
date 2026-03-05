import { useEffect } from 'react';
import {
  Modal,
  Input,
  Select,
  Row,
  Col,
  List,
  Card,
  Tag,
  Spin,
  Typography,
  Popconfirm,
} from 'antd';
import { SearchOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { CharacterBinding } from '../../types';
import * as api from '../../api';

const { Text } = Typography;

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
  useEffect(() => {
    if (visible) {
      onLoadReferenceImages();
    }
  }, [visible]);

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
      <Modal title="参考图管理" open={visible} onCancel={onClose} footer={null} width={900}>
        <div className="py-4">
          <Row gutter={16} className="mb-4">
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
                className="w-full"
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
                onChange={handleTagsChange}
                className="w-full"
                allowClear
                options={tagOptions}
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
                        <div className="h-36 overflow-hidden rounded-t-lg">
                          <img
                            src={api.getImageUrl(item.referenceImagePath || '')}
                            alt={item.characterName}
                            className="w-full h-full object-cover"
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
                          className="text-blue-500 cursor-pointer"
                        >
                          <PlusOutlined /> 添加标签
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
    </>
  );
}

export default ReferenceLibrary;
