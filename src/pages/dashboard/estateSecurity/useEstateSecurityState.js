import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getEstateSettings,
  listEstateSecurityUsers,
  updateEstateSettings
} from "../../../services/estateService";
import useEstateOverviewState from "../../../hooks/useEstateOverviewState";

export const defaultSecurityRules = {
  canApproveWithoutHomeowner: false,
  mustNotifyHomeowner: true,
  requirePhotoVerification: false,
  requireCallBeforeApproval: false
};

function getSecurityRulesFromSettings(settings) {
  const nestedRules = settings?.securityRules || settings?.rules?.security || settings?.rules || null;
  return {
    ...defaultSecurityRules,
    ...(nestedRules || {}),
    canApproveWithoutHomeowner: Boolean(
      nestedRules?.canApproveWithoutHomeowner ?? settings?.canApproveWithoutHomeowner ?? defaultSecurityRules.canApproveWithoutHomeowner
    ),
    mustNotifyHomeowner: Boolean(
      nestedRules?.mustNotifyHomeowner ?? settings?.mustNotifyHomeowner ?? defaultSecurityRules.mustNotifyHomeowner
    ),
    requirePhotoVerification: Boolean(
      nestedRules?.requirePhotoVerification ?? settings?.requirePhotoVerification ?? defaultSecurityRules.requirePhotoVerification
    ),
    requireCallBeforeApproval: Boolean(
      nestedRules?.requireCallBeforeApproval ?? settings?.requireCallBeforeApproval ?? defaultSecurityRules.requireCallBeforeApproval
    )
  };
}

export function buildSecuritySettingsPayload({
  reminderFrequencyDays,
  rules,
  autoApproveTrustedVisitors,
  suspiciousVisitWindowMinutes,
  suspiciousHouseThreshold,
  suspiciousRejectionThreshold
}) {
  const parsedReminderDays = Number.parseInt(String(reminderFrequencyDays ?? 1), 10);
  const parsedVisitWindow = Number.parseInt(String(suspiciousVisitWindowMinutes ?? 20), 10);
  const parsedHouseThreshold = Number.parseInt(String(suspiciousHouseThreshold ?? 3), 10);
  const parsedRejectionThreshold = Number.parseInt(String(suspiciousRejectionThreshold ?? 2), 10);

  return {
    reminderFrequencyDays: Number.isFinite(parsedReminderDays) && parsedReminderDays > 0 ? parsedReminderDays : 1,
    canApproveWithoutHomeowner: Boolean(rules?.canApproveWithoutHomeowner),
    mustNotifyHomeowner: Boolean(rules?.mustNotifyHomeowner ?? true),
    requirePhotoVerification: Boolean(rules?.requirePhotoVerification),
    requireCallBeforeApproval: Boolean(rules?.requireCallBeforeApproval),
    autoApproveTrustedVisitors: Boolean(autoApproveTrustedVisitors),
    suspiciousVisitWindowMinutes: Number.isFinite(parsedVisitWindow) && parsedVisitWindow > 0 ? parsedVisitWindow : 20,
    suspiciousHouseThreshold: Number.isFinite(parsedHouseThreshold) && parsedHouseThreshold > 0 ? parsedHouseThreshold : 3,
    suspiciousRejectionThreshold: Number.isFinite(parsedRejectionThreshold) && parsedRejectionThreshold > 0 ? parsedRejectionThreshold : 2
  };
}

export function useEstateSecurityState() {
  const { overview, estateId, loading: overviewLoading, error, setError } = useEstateOverviewState();
  const [selectedEstateId, setSelectedEstateId] = useState(estateId || "");
  const [securityUsers, setSecurityUsers] = useState([]);
  const [securityRules, setSecurityRules] = useState(defaultSecurityRules);
  const [reminderFrequencyDays, setReminderFrequencyDays] = useState(1);
  const [autoApproveTrustedVisitors, setAutoApproveTrustedVisitors] = useState(false);
  const [suspiciousVisitWindowMinutes, setSuspiciousVisitWindowMinutes] = useState(20);
  const [suspiciousHouseThreshold, setSuspiciousHouseThreshold] = useState(3);
  const [suspiciousRejectionThreshold, setSuspiciousRejectionThreshold] = useState(2);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (estateId && !selectedEstateId) setSelectedEstateId(estateId);
  }, [estateId, selectedEstateId]);

  const loadSecurity = useCallback(async () => {
    if (!selectedEstateId) return;
    setLoading(true);
    try {
      const [users, settings] = await Promise.all([
        listEstateSecurityUsers(selectedEstateId),
        getEstateSettings(selectedEstateId).catch(() => null)
      ]);
      setSecurityUsers(Array.isArray(users) ? users : []);
      if (settings) {
        setSecurityRules(getSecurityRulesFromSettings(settings));
        setReminderFrequencyDays(settings?.reminderFrequencyDays ?? 1);
        setAutoApproveTrustedVisitors(settings?.autoApproveTrustedVisitors ?? false);
        setSuspiciousVisitWindowMinutes(settings?.suspiciousVisitWindowMinutes ?? 20);
        setSuspiciousHouseThreshold(settings?.suspiciousHouseThreshold ?? 3);
        setSuspiciousRejectionThreshold(settings?.suspiciousRejectionThreshold ?? 2);
      }
    } catch (loadError) {
      setError(loadError?.message || "Failed to load estate security.");
    } finally {
      setLoading(false);
    }
  }, [selectedEstateId, setError]);

  useEffect(() => {
    loadSecurity();
  }, [loadSecurity]);

  const normalizedUsers = useMemo(
    () =>
      securityUsers.map((user) => ({
        ...user,
        active: typeof user.active === "boolean" ? user.active : !user.suspendedAt
      })),
    [securityUsers]
  );

  const stats = useMemo(
    () => ({
      active: normalizedUsers.filter((user) => user.active).length,
      suspended: normalizedUsers.filter((user) => !user.active).length,
      total: normalizedUsers.length
    }),
    [normalizedUsers]
  );

  const currentEstate = useMemo(() => {
    const estates = overview?.estates ?? [];
    return estates.find((row) => String(row.id) === String(selectedEstateId)) ?? estates[0] ?? null;
  }, [overview?.estates, selectedEstateId]);

  async function saveSettings(next = {}) {
    const payload = buildSecuritySettingsPayload({
      reminderFrequencyDays: next.reminderFrequencyDays ?? reminderFrequencyDays,
      rules: next.rules ?? securityRules,
      autoApproveTrustedVisitors: next.autoApproveTrustedVisitors ?? autoApproveTrustedVisitors,
      suspiciousVisitWindowMinutes: next.suspiciousVisitWindowMinutes ?? suspiciousVisitWindowMinutes,
      suspiciousHouseThreshold: next.suspiciousHouseThreshold ?? suspiciousHouseThreshold,
      suspiciousRejectionThreshold: next.suspiciousRejectionThreshold ?? suspiciousRejectionThreshold
    });
    await updateEstateSettings(selectedEstateId, payload);
  }

  return {
    overview,
    currentEstate,
    estateId: selectedEstateId,
    overviewLoading,
    loading,
    error,
    securityUsers: normalizedUsers,
    setSecurityUsers,
    stats,
    securityRules,
    setSecurityRules,
    reminderFrequencyDays,
    setReminderFrequencyDays,
    autoApproveTrustedVisitors,
    setAutoApproveTrustedVisitors,
    suspiciousVisitWindowMinutes,
    setSuspiciousVisitWindowMinutes,
    suspiciousHouseThreshold,
    setSuspiciousHouseThreshold,
    suspiciousRejectionThreshold,
    setSuspiciousRejectionThreshold,
    reload: loadSecurity,
    saveSettings
  };
}
