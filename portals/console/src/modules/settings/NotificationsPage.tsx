"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Checkbox,
  Icon,
  ActionButton,
  PageHeader,
} from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import { useTranslations } from "next-intl";

type ChannelKey = "inbox" | "email" | "sms";
type TopicKey =
  | "account"
  | "security"
  | "subscription"
  | "billing"
  | "usage"
  | "product";
type TopicGroupKey = "identity" | "commerce" | "system";

type ChannelMeta = {
  key: ChannelKey;
  icon: IconName;
};

type TopicPreference = {
  key: TopicKey;
  group: TopicGroupKey;
  icon: IconName;
  channels: Record<ChannelKey, boolean>;
  lockedChannels?: ChannelKey[];
};

type NotificationState = {
  topics: TopicPreference[];
};

const STORAGE_KEY = "vxture.console.notificationPreferences.v3";

const CHANNELS: ChannelMeta[] = [
  { key: "inbox", icon: "bell" },
  { key: "email", icon: "mail" },
  { key: "sms", icon: "phone" },
];

const TOPIC_GROUPS: Array<{ key: TopicGroupKey; icon: IconName }> = [
  { key: "identity", icon: "user" },
  { key: "commerce", icon: "chart-bar" },
  { key: "system", icon: "server" },
];

const DEFAULT_NOTIFICATION_STATE: NotificationState = {
  topics: [
    {
      key: "account",
      group: "identity",
      icon: "user",
      channels: { inbox: true, email: false, sms: false },
    },
    {
      key: "security",
      group: "identity",
      icon: "shield-check",
      channels: { inbox: true, email: false, sms: false },
      lockedChannels: ["inbox"],
    },
    {
      key: "subscription",
      group: "commerce",
      icon: "chart-bar",
      channels: { inbox: true, email: false, sms: false },
    },
    {
      key: "billing",
      group: "commerce",
      icon: "calendar",
      channels: { inbox: true, email: false, sms: false },
    },
    {
      key: "usage",
      group: "commerce",
      icon: "database",
      channels: { inbox: true, email: false, sms: false },
    },
    {
      key: "product",
      group: "system",
      icon: "sparkles",
      channels: { inbox: true, email: false, sms: false },
    },
  ],
};

function readStoredState(): NotificationState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_NOTIFICATION_STATE;
    }

    const parsed = JSON.parse(stored) as Partial<NotificationState>;
    const storedTopics = Array.isArray(parsed.topics) ? parsed.topics : [];

    return {
      topics: DEFAULT_NOTIFICATION_STATE.topics.map((topic) => {
        const storedTopic = storedTopics.find(
          (item) => item?.key === topic.key,
        );
        const storedChannels =
          storedTopic &&
          typeof storedTopic.channels === "object" &&
          storedTopic.channels !== null
            ? storedTopic.channels
            : {};

        return {
          ...topic,
          channels: {
            ...topic.channels,
            ...storedChannels,
          },
        };
      }),
    };
  } catch {
    return DEFAULT_NOTIFICATION_STATE;
  }
}

export function NotificationsPage() {
  const t = useTranslations("notificationsPage");
  const [state, setState] = useState<NotificationState>(
    DEFAULT_NOTIFICATION_STATE,
  );
  const [messageKey, setMessageKey] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readStoredState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const totalTopics = state.topics.length;
  const enabledTopics = state.topics.filter((topic) =>
    CHANNELS.some((channel) => topic.channels[channel.key]),
  ).length;
  const emailTopics = state.topics.filter(
    (topic) => topic.channels.email,
  ).length;
  const smsTopics = state.topics.filter((topic) => topic.channels.sms).length;

  function markSaved() {
    setMessageKey("feedback.saved");
  }

  function resetDefaults() {
    setState(DEFAULT_NOTIFICATION_STATE);
    setMessageKey("feedback.reset");
  }

  function toggleTopicChannel(
    topicKey: TopicKey,
    channelKey: ChannelKey,
    enabled: boolean,
  ) {
    setState((current) => ({
      topics: current.topics.map((topic) => {
        if (
          topic.key !== topicKey ||
          topic.lockedChannels?.includes(channelKey)
        ) {
          return topic;
        }

        return {
          ...topic,
          channels: {
            ...topic.channels,
            [channelKey]: enabled,
          },
        };
      }),
    }));
    setMessageKey(null);
  }

  return (
    <div className="vx-page-stack vx-notifications-page">
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
        secondary={<Badge>{t("backend.pending")}</Badge>}
        action={
          <div className="vx-notification-header-actions">
            <ActionButton variant="outline" icon="x" onClick={resetDefaults}>
              {t("actions.reset")}
            </ActionButton>
            <ActionButton icon="check" onClick={markSaved}>
              {t("actions.save")}
            </ActionButton>
          </div>
        }
      />

      {messageKey ? (
        <p className="vx-profile-message">{t(messageKey)}</p>
      ) : null}

      <section className="vx-notification-preferences">
        <div className="vx-notification-preferences__status">
          <Icon name="bell" size="sm" fallback="placeholder" />
          <div>
            <span>{t("preference.label")}</span>
            <strong>{t("preference.enabled")}</strong>
          </div>
        </div>
        <div
          className="vx-notification-preferences__stats"
          aria-label={t("summary.title")}
        >
          <div>
            <Icon name="bell" size="xs" fallback="placeholder" />
            <span>{t("summary.inboxDefault")}</span>
          </div>
          <div>
            <Icon name="mail" size="xs" fallback="placeholder" />
            <span>{t("summary.emailValue", { count: emailTopics })}</span>
          </div>
          <div>
            <Icon name="phone" size="xs" fallback="placeholder" />
            <span>{t("summary.smsValue", { count: smsTopics })}</span>
          </div>
          <div>
            <span>{t("summary.topics")}</span>
            <strong>
              {t("summary.topicsValue", {
                enabled: enabledTopics,
                total: totalTopics,
              })}
            </strong>
          </div>
        </div>
      </section>

      <section className="vx-notification-board">
        <header className="vx-notification-board__header">
          <h2>{t("topics.title")}</h2>
          <span>{t("topics.count", { count: totalTopics })}</span>
        </header>

        <div className="vx-notification-groups">
          {TOPIC_GROUPS.map((group) => {
            const groupTopics = state.topics.filter(
              (topic) => topic.group === group.key,
            );

            return (
              <section key={group.key} className="vx-notification-group">
                <div className="vx-notification-group__title">
                  <Icon name={group.icon} size="xs" fallback="placeholder" />
                  <div>
                    <h3>{t(`groups.${group.key}`)}</h3>
                    <span>
                      {t("topics.groupCount", { count: groupTopics.length })}
                    </span>
                  </div>
                </div>

                <div className="vx-notification-table">
                  <div className="vx-notification-table__header">
                    <span>{t("topics.columns.topic")}</span>
                    {CHANNELS.map((channel) => (
                      <span key={channel.key}>
                        <Icon
                          name={channel.icon}
                          size="xs"
                          fallback="placeholder"
                        />
                        {t(`channels.short.${channel.key}`)}
                      </span>
                    ))}
                    <span>{t("topics.columns.status")}</span>
                  </div>

                  {groupTopics.map((topic) => {
                    const enabled = CHANNELS.some(
                      (channel) => topic.channels[channel.key],
                    );
                    const locked = Boolean(topic.lockedChannels?.length);

                    return (
                      <div
                        key={topic.key}
                        className="vx-notification-table__row"
                      >
                        <div className="vx-notification-topic-cell">
                          <span aria-hidden="true">
                            <Icon
                              name={topic.icon}
                              size="xs"
                              fallback="placeholder"
                            />
                          </span>
                          <strong>
                            {t(`topics.items.${topic.key}.title`)}
                          </strong>
                          {locked ? (
                            <Badge>{t("topics.policyLocked")}</Badge>
                          ) : null}
                        </div>

                        {CHANNELS.map((channel) => {
                          const channelLocked =
                            topic.lockedChannels?.includes(channel.key) ??
                            false;
                          const checked = topic.channels[channel.key];

                          return (
                            <span
                              key={channel.key}
                              className={
                                channelLocked
                                  ? "vx-notification-check vx-notification-check--locked"
                                  : "vx-notification-check"
                              }
                              title={
                                channelLocked
                                  ? t("topics.policyLockedDescription")
                                  : t(`channels.short.${channel.key}`)
                              }
                            >
                              <Checkbox
                                checked={checked}
                                disabled={channelLocked}
                                aria-label={t("topics.toggleLabel", {
                                  topic: t(`topics.items.${topic.key}.title`),
                                  channel: t(
                                    `channels.items.${channel.key}.title`,
                                  ),
                                })}
                                onCheckedChange={(value) =>
                                  toggleTopicChannel(
                                    topic.key,
                                    channel.key,
                                    value === true,
                                  )
                                }
                              />
                            </span>
                          );
                        })}

                        <span
                          className={
                            enabled
                              ? "vx-notification-status vx-notification-status--on"
                              : "vx-notification-status"
                          }
                        >
                          {enabled
                            ? t("topics.subscribed")
                            : t("topics.unsubscribed")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
