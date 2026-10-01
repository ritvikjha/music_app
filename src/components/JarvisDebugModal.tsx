/**
 * src/components/JarvisDebugModal.tsx
 *
 * Hidden developer debugging modal for the Jarvis Brain intent parser.
 * Accessed by long-pressing the app version text in Profile.
 *
 * Features:
 *   - Live interactive utterance input with instant testing
 *   - Quick-select test chip presets
 *   - Displays parsed intent, slots JSON, spoken reply, source (local vs LLM), and latency (ms)
 *   - One-click benchmark runner executing the complete 77-utterance test suite on-device
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import { parseIntent } from '../jarvis/brain/router';
import type { IntentResult } from '../jarvis/brain/types';
import { executeIntent, type ActionResult } from '../jarvis/actions/executor';
import { runBrainTestSuite, type TestSuiteSummary } from '../jarvis/brain/testUtterances';
import {
  getJarvisLogs,
  clearJarvisLogs,
  copyJarvisLogsToClipboard,
  type JarvisLogEvent,
} from '../jarvis/eventLogger';

interface JarvisDebugModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRESETS = [
  'play Kesariya',
  'agla gaana',
  'set a sleep timer for 20 minutes',
  'who sang Tum Hi Ho',
  'awaaz badhao',
  'ye gaana pasand hai',
  'volume 50 percent',
  'forward 15 seconds',
  'open library',
];

export const JarvisDebugModal: React.FC<JarvisDebugModalProps> = ({
  visible,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'tester' | 'suite' | 'logs'>('tester');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IntentResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);

  // Test suite state
  const [isRunningSuite, setIsRunningSuite] = useState(false);
  const [suiteSummary, setSuiteSummary] = useState<TestSuiteSummary | null>(null);
  const [showFullTable, setShowFullTable] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<JarvisLogEvent[]>([]);
  const [copiedLogs, setCopiedLogs] = useState(false);

  const refreshLogs = () => {
    setLogs(getJarvisLogs());
  };

  const handleCopyLogs = async () => {
    const ok = await copyJarvisLogsToClipboard();
    if (ok) {
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    }
  };

  const handleClearLogs = () => {
    clearJarvisLogs();
    refreshLogs();
  };

  const handleTest = async (utteranceToTest?: string) => {
    const text = utteranceToTest || inputText;
    if (!text.trim()) return;

    setIsLoading(true);
    setActionResult(null);
    try {
      const res = await parseIntent(text);
      setResult(res);
    } catch (err: any) {
      console.error('[Jarvis Debug] Test error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!result) return;
    setIsExecuting(true);
    setActionResult(null);
    try {
      const res = await executeIntent(result);
      setActionResult(res);
    } catch (err: any) {
      console.error('[Jarvis Debug] Execute error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRunSuite = async () => {
    setIsRunningSuite(true);
    setSuiteSummary(null);
    try {
      const summary = await runBrainTestSuite();
      setSuiteSummary(summary);
    } catch (err: any) {
      console.error('[Jarvis Debug] Suite error:', err);
    } finally {
      setIsRunningSuite(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      refreshLogs();
    }
  }, [activeTab]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.brainIconBadge}>
              <Ionicons name="hardware-chip-outline" size={20} color="#38BDF8" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Jarvis Brain Debugger</Text>
              <Text style={styles.headerSubtitle}>Two-tier NLP & System Telemetry</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavRow}>
          <TouchableOpacity
            style={[styles.tabNavBtn, activeTab === 'tester' && styles.tabNavBtnActive]}
            onPress={() => setActiveTab('tester')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabNavText, activeTab === 'tester' && styles.tabNavTextActive]}>
              Intent Tester
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabNavBtn, activeTab === 'suite' && styles.tabNavBtnActive]}
            onPress={() => setActiveTab('suite')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabNavText, activeTab === 'suite' && styles.tabNavTextActive]}>
              Benchmark Suite
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabNavBtn, activeTab === 'logs' && styles.tabNavBtnActive]}
            onPress={() => setActiveTab('logs')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabNavText, activeTab === 'logs' && styles.tabNavTextActive]}>
              Event Logs (100)
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'logs' ? (
            <View style={styles.logsContainer}>
              {/* Logs Action Bar */}
              <View style={styles.logsActionRow}>
                <TouchableOpacity
                  style={[styles.logsActionBtn, copiedLogs && styles.logsActionBtnSuccess]}
                  onPress={handleCopyLogs}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={copiedLogs ? 'checkmark-circle' : 'copy-outline'}
                    size={16}
                    color="#FFF"
                  />
                  <Text style={styles.logsActionText}>
                    {copiedLogs ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
                  </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.logsSmallBtn}
                    onPress={refreshLogs}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh" size={16} color={colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.logsSmallBtn}
                    onPress={handleClearLogs}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {logs.length === 0 ? (
                <View style={styles.emptyLogsCard}>
                  <Ionicons name="file-tray-outline" size={36} color="#475569" />
                  <Text style={styles.emptyLogsTitle}>No Events Logged Yet</Text>
                  <Text style={styles.emptyLogsSubtitle}>
                    Ring buffer stores the last 100 state transitions, wake-word hits, speech transcripts, and native actions.
                  </Text>
                </View>
              ) : (
                <View style={styles.logsList}>
                  {logs.map((item) => {
                    const timeStr = new Date(item.timestamp).toLocaleTimeString();
                    const badgeColor =
                      item.type === 'WAKE_HIT'
                        ? '#10B981'
                        : item.type === 'TRANSCRIPT'
                        ? '#38BDF8'
                        : item.type === 'ACTION'
                        ? '#8B5CF6'
                        : item.type === 'ERROR'
                        ? '#EF4444'
                        : item.type === 'SERVICE'
                        ? '#F59E0B'
                        : '#64748B';

                    return (
                      <View key={item.id} style={styles.logCard}>
                        <View style={styles.logHeader}>
                          <View style={[styles.logTypeBadge, { backgroundColor: `${badgeColor}22`, borderColor: `${badgeColor}55` }]}>
                            <Text style={[styles.logTypeText, { color: badgeColor }]}>
                              {item.type}
                            </Text>
                          </View>
                          <Text style={styles.logTimestamp}>{timeStr}</Text>
                        </View>
                        <Text style={styles.logMessage}>{item.message}</Text>
                        {item.details && (
                          <Text style={styles.logDetails} numberOfLines={3}>
                            {JSON.stringify(item.details)}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : (
            <>
              {/* Input Section */}
              <Text style={styles.sectionLabel}>TEST UTTERANCE</Text>
              <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="e.g. play Kesariya by Arijit Singh"
              placeholderTextColor="#666"
              value={inputText}
              onChangeText={setInputText}
              returnKeyType="go"
              onSubmitEditing={() => handleTest()}
            />
            <TouchableOpacity
              style={[styles.testBtn, !inputText.trim() && styles.disabledBtn]}
              onPress={() => handleTest()}
              disabled={isLoading || !inputText.trim()}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.testBtnText}>Parse</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Preset Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.presetsRow}
          >
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.presetChip}
                onPress={() => {
                  setInputText(p);
                  handleTest(p);
                }}
              >
                <Text style={styles.presetChipText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Single Result Viewer */}
          {result && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={styles.intentBadge}>
                  <Text style={styles.intentBadgeText}>{result.intent}</Text>
                </View>

                <View style={styles.metaRow}>
                  <View
                    style={[
                      styles.sourceBadge,
                      result.source === 'local' ? styles.localBadge : styles.llmBadge,
                    ]}
                  >
                    <Text style={styles.sourceBadgeText}>
                      {result.source.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.latencyText}>
                    ⚡ {result.latencyMs ?? 0} ms
                  </Text>
                </View>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Spoken Reply:</Text>
                <Text style={styles.spokenReplyText}>"{result.spokenReply}"</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Confidence:</Text>
                <Text style={styles.confidenceText}>
                  {(result.confidence * 100).toFixed(0)}%
                </Text>
              </View>

              <Text style={styles.slotsLabel}>SLOTS & RETURN JSON:</Text>
              <View style={styles.jsonBox}>
                <Text style={styles.jsonText}>
                  {JSON.stringify(
                    {
                      intent: result.intent,
                      slots: result.slots,
                      confidence: result.confidence,
                      spokenReply: result.spokenReply,
                      needsConfirmation: result.needsConfirmation,
                      source: result.source,
                    },
                    null,
                    2
                  )}
                </Text>
              </View>

              {/* Execute Action Button */}
              <TouchableOpacity
                style={styles.executeBtn}
                onPress={handleExecute}
                disabled={isExecuting}
                activeOpacity={0.8}
              >
                {isExecuting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.executeBtnInner}>
                    <Ionicons name="flash" size={16} color="#FFF" />
                    <Text style={styles.executeBtnText}>Execute Action on Jam App</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Action Result Box */}
              {actionResult && (
                <View
                  style={[
                    styles.actionResultBox,
                    actionResult.ok ? styles.actionOk : styles.actionError,
                  ]}
                >
                  <View style={styles.actionHeaderRow}>
                    <Ionicons
                      name={actionResult.ok ? 'checkmark-circle' : 'alert-circle'}
                      size={18}
                      color={actionResult.ok ? '#10B981' : '#F43F5E'}
                    />
                    <Text
                      style={[
                        styles.actionResultTitle,
                        { color: actionResult.ok ? '#10B981' : '#F43F5E' },
                      ]}
                    >
                      {actionResult.ok ? 'Executed Successfully' : 'Execution Failed'}
                    </Text>
                  </View>
                  <Text style={styles.actionResultText}>"{actionResult.spokenReply}"</Text>
                  {actionResult.needsConfirmation && (
                    <Text style={styles.actionConfirmText}>⚠️ Destructive action requested confirmation</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Benchmark Test Suite Section */}
          <View style={styles.divider} />

          <View style={styles.suiteHeaderRow}>
            <View>
              <Text style={styles.sectionLabel}>BENCHMARK TEST SUITE</Text>
              <Text style={styles.suiteSubtext}>77 Test cases (Hinglish, Slips, Songs)</Text>
            </View>
            <TouchableOpacity
              style={styles.runSuiteBtn}
              onPress={handleRunSuite}
              disabled={isRunningSuite}
            >
              {isRunningSuite ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.runBtnInner}>
                  <Ionicons name="play" size={14} color="#FFF" />
                  <Text style={styles.runSuiteBtnText}>Run Suite</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Test Suite Summary */}
          {suiteSummary && (
            <View style={styles.suiteSummaryCard}>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{suiteSummary.passRate}%</Text>
                  <Text style={styles.statLabel}>Pass Rate</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statVal, { color: '#10B981' }]}>
                    {suiteSummary.passed}/{suiteSummary.total}
                  </Text>
                  <Text style={styles.statLabel}>Passed</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statVal, { color: '#38BDF8' }]}>
                    {suiteSummary.localPercentage}%
                  </Text>
                  <Text style={styles.statLabel}>Resolved Local</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{suiteSummary.avgLocalLatencyMs}ms</Text>
                  <Text style={styles.statLabel}>Avg Latency</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.toggleTableBtn}
                onPress={() => setShowFullTable(!showFullTable)}
              >
                <Text style={styles.toggleTableText}>
                  {showFullTable ? 'Hide Utterances Table' : 'Show All 77 Utterances'}
                </Text>
                <Ionicons
                  name={showFullTable ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#38BDF8"
                />
              </TouchableOpacity>

              {showFullTable && (
                <View style={styles.tableContainer}>
                  {suiteSummary.items.map((item, idx) => (
                    <View key={idx} style={styles.tableRow}>
                      <Ionicons
                        name={item.passed ? 'checkmark-circle' : 'close-circle'}
                        size={16}
                        color={item.passed ? '#10B981' : '#EF4444'}
                        style={styles.checkIcon}
                      />
                      <View style={styles.rowTextCol}>
                        <Text style={styles.tableUtterance} numberOfLines={1}>
                          "{item.utterance}"
                        </Text>
                        <Text style={styles.tableMeta}>
                          {item.actual} • {item.source} • {item.latencyMs}ms
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  tabNavRow: {
    flexDirection: 'row',
    backgroundColor: '#161922',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2330',
  },
  tabNavBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabNavBtnActive: {
    borderBottomColor: colors.accent,
  },
  tabNavText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  tabNavTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  logsContainer: {
    paddingBottom: spacing.xl,
  },
  logsActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  logsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  logsActionBtnSuccess: {
    backgroundColor: '#10B981',
  },
  logsActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  logsSmallBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLogsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: spacing.lg,
  },
  emptyLogsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 12,
  },
  emptyLogsSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  logsList: {
    gap: 8,
  },
  logCard: {
    backgroundColor: '#161922',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#1E2330',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  logTypeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logTimestamp: {
    fontSize: 11,
    color: '#64748B',
  },
  logMessage: {
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '500',
    lineHeight: 18,
  },
  logDetails: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 4,
    borderRadius: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#0F1117',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 54,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2330',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  brainIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: '#1A1E29',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    color: '#FFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2A3142',
  },
  testBtn: {
    height: 46,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#6366F1',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  testBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  presetsRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  presetChip: {
    backgroundColor: '#1E2330',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: '#2D3548',
  },
  presetChipText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  resultCard: {
    backgroundColor: '#161922',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#262D3D',
    marginBottom: spacing.lg,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  intentBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  intentBadgeText: {
    color: '#818CF8',
    fontWeight: '700',
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  localBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  llmBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
  },
  latencyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#64748B',
    marginRight: spacing.xs,
  },
  spokenReplyText: {
    fontSize: 14,
    color: '#38BDF8',
    fontWeight: '600',
  },
  confidenceText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  slotsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  jsonBox: {
    backgroundColor: '#0D0E12',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#1F2430',
  },
  jsonText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#A5B4FC',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E2330',
    marginVertical: spacing.lg,
  },
  suiteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  suiteSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  runSuiteBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  runBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  runSuiteBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  suiteSummaryCard: {
    backgroundColor: '#161922',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#262D3D',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  statBox: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  toggleTableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#1E2330',
  },
  toggleTableText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  tableContainer: {
    marginTop: spacing.sm,
    maxHeight: 260,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1E29',
  },
  checkIcon: {
    marginRight: spacing.sm,
  },
  rowTextCol: {
    flex: 1,
  },
  tableUtterance: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500',
  },
  tableMeta: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
  executeBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  executeBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  executeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  actionResultBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  actionOk: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  actionError: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  actionResultTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionResultText: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  actionConfirmText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 4,
  },
});
