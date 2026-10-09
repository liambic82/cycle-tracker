import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowLeft, Ellipsis, Pencil, Plus, Trash2, Undo2 } from 'lucide-react-native';
import { formatDay, type Day } from '../domain/dates';
import { type Entry } from '../domain/journal';
import {
  ACTION_LABELS,
  orderedProducts,
  PRODUCT_LABELS,
  saveProductRecord,
  type ProductRecord,
} from '../domain/flowDetails';
import { ProductRecordForm } from './ProductRecordForm';
import { Button, Chip } from './components';
import { colors, common } from './theme';

export function FlowDetails({
  date,
  entry,
  onPatch,
  done,
  onViewChange,
  saveStatus,
}: {
  date: Day;
  entry: Entry;
  onPatch: (patch: Partial<Entry>) => void;
  done: () => void;
  onViewChange: () => void;
  saveStatus: React.ReactNode;
}) {
  const [form, setForm] = useState<ProductRecord | 'new' | null>(null);
  const [options, setOptions] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [removed, setRemoved] = useState<ProductRecord | null>(null);
  const [error, setError] = useState('');
  const changeForm = (value: ProductRecord | 'new' | null) => {
    setForm(value);
    setOptions(null);
    setConfirm(false);
    setError('');
    onViewChange();
  };
  if (form !== null)
    return (
      <ProductRecordForm
        key={form === 'new' ? 'new' : form.id}
        date={date}
        existing={form === 'new' ? null : form}
        cancel={() => changeForm(null)}
        save={(record) => {
          onPatch({
            productRecords: saveProductRecord(entry.productRecords, record, form !== 'new'),
          });
          changeForm(null);
        }}
      />
    );
  return (
    <View style={{ gap: 24 }}>
      <Button secondary label="Back to daily journal" icon={ArrowLeft} onPress={done} />
      <View style={{ gap: 6 }}>
        <Text style={common.heading}>Flow details</Text>
        <Text style={common.label}>
          {formatDay(date, { month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
        <Text style={common.body}>
          Optional observations, in as much detail as you find helpful. These are separate from your
          flow choice.
        </Text>
      </View>
      <View style={{ gap: 18 }}>
        {(['clots', 'flooding'] as const).map((field) => {
          const label = field === 'clots' ? 'Clots' : 'Flooding';
          return (
            <View key={field} style={{ gap: 10 }}>
              <Text style={common.label}>{label} noticed?</Text>
              {field === 'flooding' && (
                <Text style={common.small}>
                  A sudden gush of heavy menstrual bleeding, which may overwhelm your period
                  products and leak onto clothes or bedding.
                </Text>
              )}
              <View style={common.wrap}>
                {([null, false, true] as const).map((value) => {
                  const choice = value === null ? 'Not logged' : value ? 'Yes' : 'No';
                  return (
                    <Chip
                      key={choice}
                      label={choice}
                      accessibilityLabel={`${label}: ${choice}`}
                      selected={entry[field] === value}
                      onPress={() => onPatch({ [field]: value })}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}
        <Text style={common.small}>
          These choices save as you go. Not logged means no observation was recorded.
        </Text>
      </View>
      <View style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 22, gap: 14 }}>
        <Text style={common.heading}>Product log</Text>
        <Text style={common.small}>
          {entry.productRecords.length
            ? `${entry.productRecords.length} ${entry.productRecords.length === 1 ? 'record' : 'records'} for this day`
            : 'No products logged for this day.'}
        </Text>
        {removed && (
          <View style={{ backgroundColor: colors.sage, padding: 14, borderRadius: 12, gap: 10 }}>
            <Text accessibilityLiveRegion="polite" style={common.body}>
              {PRODUCT_LABELS[removed.type]} record removed. Undo is available until you leave flow
              details or remove another record.
            </Text>
            <Button
              secondary
              label="Undo product removal"
              icon={Undo2}
              onPress={() => {
                try {
                  onPatch({
                    productRecords: saveProductRecord(entry.productRecords, removed, false),
                  });
                  setRemoved(null);
                  setError('');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not restore this record.');
                }
              }}
            />
          </View>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={common.error}>
            {error}
          </Text>
        )}
        {orderedProducts(entry.productRecords).map((record, index) => (
          <View
            key={record.id}
            style={{
              borderWidth: 1,
              borderColor: colors.line,
              padding: 14,
              borderRadius: 14,
              gap: 10,
            }}
          >
            <View style={[common.between, { alignItems: 'flex-start' }]}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={common.label}>
                  {PRODUCT_LABELS[record.type]} · {ACTION_LABELS[record.action]}
                </Text>
                <Text style={common.body}>
                  {record.time ?? 'Time not logged'} · {record.quantity}{' '}
                  {record.action === 'emptied'
                    ? record.quantity === 1
                      ? 'emptying'
                      : 'emptyings'
                    : record.quantity === 1
                      ? 'product'
                      : 'products'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Product record ${index + 1} options`}
                accessibilityState={{ expanded: options === record.id }}
                aria-expanded={options === record.id}
                onPress={() => {
                  setOptions(options === record.id ? null : record.id);
                  setConfirm(false);
                }}
                style={{
                  width: 48,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: colors.background,
                }}
              >
                <Ellipsis size={22} color={colors.plum} />
              </Pressable>
            </View>
            {!!record.detail && <Text style={common.small}>{record.detail}</Text>}
            {record.collectedMl !== null && (
              <Text style={common.small}>Collected: {record.collectedMl} mL</Text>
            )}
            {options === record.id &&
              (confirm ? (
                <View style={{ gap: 10 }}>
                  <Text style={common.body}>
                    Remove only this {PRODUCT_LABELS[record.type].toLowerCase()} record from{' '}
                    {formatDay(date, { month: 'short', day: 'numeric', year: 'numeric' })}? Other
                    daily details will stay.
                  </Text>
                  <Button
                    label="Keep product record"
                    onPress={() => {
                      setOptions(null);
                      setConfirm(false);
                    }}
                  />
                  <Button
                    secondary
                    danger
                    label="Remove this product record"
                    icon={Trash2}
                    onPress={() => {
                      onPatch({
                        productRecords: entry.productRecords.filter(
                          (item) => item.id !== record.id,
                        ),
                      });
                      setRemoved({ ...record });
                      setOptions(null);
                      setConfirm(false);
                      setError('');
                    }}
                  />
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <Button
                    secondary
                    label="Edit product record"
                    icon={Pencil}
                    onPress={() => changeForm(record)}
                  />
                  <Button
                    secondary
                    danger
                    label="Remove product record"
                    icon={Trash2}
                    onPress={() => setConfirm(true)}
                  />
                </View>
              ))}
          </View>
        ))}
        <Button label="Add product record" icon={Plus} onPress={() => changeForm('new')} />
      </View>
      {saveStatus}
    </View>
  );
}
