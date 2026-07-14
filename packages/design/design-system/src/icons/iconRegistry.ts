/**
 * iconRegistry.ts - 图标注册中心
 * @package @vxture/design-system
 *
 * 功能：图标注册中心，唯一直接 import @phosphor-icons/react 的文件
 *       业务层和其他模块不得直接引用 Phosphor，统一通过此文件访问
 *       新增图标：在此文件和 iconDictionary.ts 中同时添加
 *
 * @copyright Vxture Team
 * @layer Infrastructure
 * @category Registry
 */

import {
  // ==========================================================================
  // 通用交互 - 导航
  // ==========================================================================
  HouseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsLeftRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  CaretDownIcon,
  CaretDoubleUpIcon,
  CaretDoubleDownIcon,
  SquaresFourIcon,

  // ==========================================================================
  // 通用交互 - 操作
  // ==========================================================================
  MagnifyingGlassIcon,
  DotsNineIcon,
  DotsThreeVerticalIcon,
  GearIcon,
  BellIcon,
  PencilIcon,
  KeyIcon,
  TrashIcon,
  PlusIcon,
  XIcon,
  CheckIcon,
  CopyIcon,
  PlayIcon,
  StopIcon,
  TextIndentIcon,
  TextOutdentIcon,

  // ==========================================================================
  // 通用交互 - 状态
  // ==========================================================================
  CheckCircleIcon,
  XCircleIcon,
  WarningCircleIcon,
  InfoIcon,

  // ==========================================================================
  // 云服务/智能体 - 平台
  // ==========================================================================
  RobotIcon,
  TimerIcon,
  DatabaseIcon,
  CloudIcon,
  PlugIcon,
  EraserIcon,
  CubeIcon,
  BuildingIcon,

  // ==========================================================================
  // 云服务/智能体 - 数据
  // ==========================================================================
  ChartBarIcon,
  TableIcon,
  CodeIcon,
  PiIcon,
  GitForkIcon, // graph：有向图/节点图，语义更准确
  LightbulbIcon,
  SparkleIcon,
  ShieldCheckIcon,

  // ==========================================================================
  // 用户/组织
  // ==========================================================================
  UserIcon,
  UserSwitchIcon,
  BuildingsIcon,
  UsersIcon,
  MedalIcon,
  StarIcon,

  // ==========================================================================
  // 通讯/联系
  // ==========================================================================
  EnvelopeIcon,
  PhoneIcon,
  WechatLogoIcon,
  GithubLogoIcon,
  LinkedinLogoIcon,
  ChatCircleIcon,
  PaperPlaneTiltIcon,

  // ==========================================================================
  // 时间/日历
  // ==========================================================================
  CalendarIcon,
  ClockIcon,
  ClockCounterClockwiseIcon,

  // ==========================================================================
  // 地图/位置
  // ==========================================================================
  MapPinIcon,

  // ==========================================================================
  // 主题/显示
  // ==========================================================================
  SunIcon,
  MoonIcon,
  GlobeIcon,
  ArrowsOutSimpleIcon, // maximize：原生全屏展开
  ArrowsInSimpleIcon, // minimize：原生全屏收起
  CornersOutIcon, // corners-out：伪全屏展开
  CornersInIcon, // corners-in：伪全屏收起
  ListIcon,
  RowsIcon,
  SignOutIcon,

  // ==========================================================================
  // 其他
  // ==========================================================================
  CaretLeftIcon as CaretLeftBoldIcon,
  CaretRightIcon as CaretRightBoldIcon,

  // ==========================================================================
  // 系统保留（勿删）
  // ==========================================================================
  QuestionIcon,
} from "@phosphor-icons/react";

import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import type { IconName } from "./iconDictionary";

// ============================================================================
// 图标注册表
// ============================================================================

/**
 * Phosphor 图标组件映射
 *
 * 这是设计系统中唯一直接依赖 Phosphor Icons 的地方。
 * 每个语义 key 对应唯一的图标组件，无同义重复 key。
 */
export const iconRegistry: Record<IconName, PhosphorIcon> = {
  // ==========================================================================
  // 通用交互 - 导航
  // ==========================================================================
  home: HouseIcon,
  "arrow-left": ArrowLeftIcon,
  "arrow-right": ArrowRightIcon,
  "arrow-left-right": ArrowsLeftRightIcon,
  "arrow-up": ArrowUpIcon,
  "arrow-down": ArrowDownIcon,
  "arrow-long-right": ArrowRightIcon,
  "chevron-left": CaretLeftIcon,
  "chevron-right": CaretRightIcon,
  "chevron-up": CaretUpIcon,
  "chevron-down": CaretDownIcon,
  "caret-double-up": CaretDoubleUpIcon,
  "caret-double-down": CaretDoubleDownIcon,
  "squares-four": SquaresFourIcon,

  // ==========================================================================
  // 通用交互 - 操作
  // ==========================================================================
  search: MagnifyingGlassIcon,
  "app-grid": DotsNineIcon,
  settings: GearIcon,
  help: QuestionIcon,
  bell: BellIcon,
  "more-vertical": DotsThreeVerticalIcon,
  edit: PencilIcon,
  key: KeyIcon,
  trash: TrashIcon,
  plus: PlusIcon,
  x: XIcon,
  check: CheckIcon,
  copy: CopyIcon,
  play: PlayIcon,
  stop: StopIcon,
  "text-indent": TextIndentIcon,
  "text-outdent": TextOutdentIcon,

  // ==========================================================================
  // 通用交互 - 状态
  // ==========================================================================
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: WarningCircleIcon,
  info: InfoIcon,

  // ==========================================================================
  // 云服务/智能体 - 平台
  // ==========================================================================
  agent: RobotIcon,
  workflow: TimerIcon,
  trigger: TimerIcon,
  database: DatabaseIcon,
  cloud: CloudIcon,
  plug: PlugIcon,
  server: EraserIcon,
  cube: CubeIcon,
  "building-library": BuildingIcon,

  // ==========================================================================
  // 云服务/智能体 - 数据
  // ==========================================================================
  "chart-bar": ChartBarIcon,
  table: TableIcon,
  code: CodeIcon,
  api: PiIcon,
  graph: GitForkIcon,
  lightbulb: LightbulbIcon,
  sparkles: SparkleIcon,
  "shield-check": ShieldCheckIcon,

  // ==========================================================================
  // 用户/组织
  // ==========================================================================
  user: UserIcon,
  role: UsersIcon,
  "user-switch": UserSwitchIcon,
  buildings: BuildingsIcon,
  users: UsersIcon,
  medal: MedalIcon,
  star: StarIcon,

  // ==========================================================================
  // 通讯/联系
  // ==========================================================================
  mail: EnvelopeIcon,
  phone: PhoneIcon,
  wechat: WechatLogoIcon,
  github: GithubLogoIcon,
  linkedin: LinkedinLogoIcon,
  "chat-circle": ChatCircleIcon,
  "paperplane-tilt": PaperPlaneTiltIcon,

  // ==========================================================================
  // 时间/日历
  // ==========================================================================
  calendar: CalendarIcon,
  clock: ClockIcon,
  "clock-counter-clockwise": ClockCounterClockwiseIcon,

  // ==========================================================================
  // 地图/位置
  // ==========================================================================
  "map-pin": MapPinIcon,

  // ==========================================================================
  // 主题/显示
  // ==========================================================================
  sun: SunIcon,
  moon: MoonIcon,
  globe: GlobeIcon,
  maximize: ArrowsOutSimpleIcon,
  minimize: ArrowsInSimpleIcon,
  "corners-out": CornersOutIcon,
  "corners-in": CornersInIcon,
  list: ListIcon,
  rows: RowsIcon,
  "sign-out": SignOutIcon,

  // ==========================================================================
  // 其他
  // ==========================================================================
  "caret-left-bold": CaretLeftBoldIcon,
  "caret-right-bold": CaretRightBoldIcon,

  // ==========================================================================
  // 系统保留（勿删）
  // ==========================================================================
  placeholder: QuestionIcon,
};
