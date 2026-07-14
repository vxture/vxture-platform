/**
 * CTA 结构数据 - 不包含翻译文本，只定义结构
 * @package @vxture/website
 * @layer Presentation
 * @category Data - Home
 */

/**
 * CTA 功能特性配置
 */
export interface CtaFeature {
  id: string;
  icon: string;
  theme: string;
}

/**
 * CTA 行动按钮配置
 */
export interface CtaAction {
  href: string;
  variant: string;
  icon: string;
}

/**
 * CTA 联系方式配置
 */
export interface CtaContact {
  email: {
    icon: string;
    value: string;
  };
  phone: {
    icon: string;
    value: string;
  };
}

/**
 * CTA 完整数据结构
 */
export interface CtaData {
  enabled: boolean;
  titleKey: string;
  subtitleKey: string;
  features: CtaFeature[];
  actions: CtaAction[];
  contact: CtaContact;
}

/**
 * CTA 结构数据 - 使用 labelKey 映射翻译
 */
export const CTA_DATA: CtaData = {
  enabled: true,
  titleKey: "title",
  subtitleKey: "subtitle",
  features: [
    {
      id: "features-cta-01",
      icon: "layers",
      theme: "primary",
    },
    {
      id: "features-cta-02",
      icon: "users",
      theme: "primary",
    },
    {
      id: "features-cta-03",
      icon: "refresh",
      theme: "primary",
    },
  ],
  actions: [
    {
      href: "/contact",
      variant: "primary",
      icon: "calendar",
    },
    {
      href: "/ruyin-agent",
      variant: "secondary",
      icon: "bot",
    },
  ],
  contact: {
    email: {
      icon: "mail",
      value: "experts@vxture.com",
    },
    phone: {
      icon: "phone",
      value: "029-12345678",
    },
  },
};
