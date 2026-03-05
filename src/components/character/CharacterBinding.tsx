import { Button, Typography, Tag, Modal, Tabs, Radio, Checkbox, List, Image } from 'antd';
import { UserOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { CharacterBinding } from '../../types';
import * as api from '../../api';

const { Text } = Typography;

interface CharacterItemProps {
  character: {
    name: string;
    bound: boolean;
  };
  binding?: CharacterBinding;
  onUnbind: () => void;
  onOpenBindingModal: (characterName: string) => void;
}

export function CharacterItem({
  character,
  binding,
  onUnbind,
  onOpenBindingModal,
}: CharacterItemProps) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
        {binding?.referenceImagePath ? (
          <img
            src={api.getImageUrl(binding.referenceImagePath)}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <UserOutlined className="text-xl text-indigo-500" />
        )}
      </div>
      <div className="flex-1">
        <Text strong className="text-base">
          @{character.name}
        </Text>
        <Tag color={character.bound ? 'green' : 'default'}>
          {character.bound ? '已绑定' : '未绑定'}
        </Tag>
      </div>
      <div>
        {character.bound ? (
          <Button size="small" danger icon={<DeleteOutlined />} onClick={onUnbind}>
            解绑
          </Button>
        ) : (
          <Button
            size="small"
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => onOpenBindingModal(character.name)}
            className="bg-indigo-500 border-indigo-500"
          >
            绑定
          </Button>
        )}
      </div>
    </div>
  );
}

interface BindingModalProps {
  visible: boolean;
  onClose: () => void;
  charactersToBind: string[];
  setCharactersToBind: (chars: string[]) => void;
  uploadedImage: string;
  setUploadedImage: (img: string) => void;
  imageType: '人物' | '人脸' | '全身' | '场景';
  setImageType: (type: '人物' | '人脸' | '全身' | '场景') => void;
  referenceImageLibrary: CharacterBinding[];
  activeTab: 'upload' | 'library';
  setActiveTab: (tab: 'upload' | 'library') => void;
  isDragging: boolean;
  dragCounter: React.MutableRefObject<number>;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onHandleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBindSubmit: () => void;
  bindingLoading: boolean;
}

export function BindingModal({
  visible,
  onClose,
  charactersToBind,
  setCharactersToBind,
  uploadedImage,
  setUploadedImage,
  imageType,
  setImageType,
  referenceImageLibrary,
  activeTab,
  setActiveTab,
  isDragging,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onHandleFileChange,
  onBindSubmit,
  bindingLoading,
}: BindingModalProps) {
  const handleSelectFromLibrary = (binding: CharacterBinding) => {
    const path = binding.referenceImagePath?.replace(/^file:\/\//, '') || '';
    setUploadedImage(path);
  };

  return (
    <Modal
      title={
        <div>
          <div className="mb-2">绑定参考图</div>
          {charactersToBind.length > 1 && (
            <div className="text-sm text-gray-500">
              <div className="mb-1">选择要绑定的角色：</div>
              <Checkbox.Group
                value={charactersToBind}
                onChange={values => setCharactersToBind(values as string[])}
                className="flex flex-wrap gap-2"
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
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Tabs
        activeKey={activeTab}
        onChange={key => setActiveTab(key as 'upload' | 'library')}
        items={[
          {
            key: 'upload',
            label: '上传图片',
            children: (
              <>
                <div className="mb-4">
                  <Text strong>参考图类型：</Text>
                  <Radio.Group
                    value={imageType}
                    onChange={e => setImageType(e.target.value)}
                    className="ml-4"
                  >
                    <Radio value="人物">人物</Radio>
                    <Radio value="人脸">人脸</Radio>
                    <Radio value="全身">全身</Radio>
                    <Radio value="场景">场景</Radio>
                  </Radio.Group>
                </div>

                <div
                  onDragEnter={onDragEnter}
                  onDragLeave={onDragLeave}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onHandleFileChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload">
                    <div
                      className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                      }`}
                    >
                      {uploadedImage ? (
                        <div className="relative">
                          <img
                            src={api.getImageUrl(uploadedImage)}
                            alt="预览"
                            className="max-w-full max-h-64 mx-auto rounded"
                          />
                          {isDragging && (
                            <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center rounded">
                              <Text strong className="text-white text-lg">
                                释放以上传
                              </Text>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <UploadOutlined
                            className={`text-3xl mb-2 ${
                              isDragging ? 'text-blue-500' : 'text-gray-400'
                            }`}
                          />
                          <div className={isDragging ? 'text-blue-500' : 'text-gray-500'}>
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
              <div className="max-h-80 overflow-y-auto">
                {referenceImageLibrary.length > 0 ? (
                  <List
                    grid={{ gutter: 16, column: 2 }}
                    dataSource={referenceImageLibrary}
                    renderItem={item => (
                      <List.Item>
                        <div
                          onClick={() => handleSelectFromLibrary(item)}
                          className="cursor-pointer border-2 border-gray-200 dark:border-gray-600 rounded-lg p-1 hover:border-indigo-500 transition-colors"
                        >
                          <Image
                            src={api.getImageUrl(item.referenceImagePath || '')}
                            alt={item.characterName}
                            className="w-full h-28 object-cover rounded"
                          />
                          <div className="mt-2 text-center">
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
                  <div className="text-center py-8 text-gray-400">暂无已保存的参考图</div>
                )}
              </div>
            ),
          },
        ]}
      />

      <div className="mt-6 text-right">
        <Button onClick={onClose} className="mr-2">
          取消
        </Button>
        <Button
          type="primary"
          onClick={onBindSubmit}
          loading={bindingLoading}
          disabled={!uploadedImage}
          className="bg-indigo-500 border-indigo-500"
        >
          确认绑定
        </Button>
      </div>
    </Modal>
  );
}

export default CharacterItem;
