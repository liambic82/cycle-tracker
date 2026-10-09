import React, { useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { ArrowLeft, Check, Plus } from 'lucide-react-native';
import { formatDay, type Day } from '../domain/dates';
import {
  ACTION_LABELS,
  canEmpty,
  PRODUCT_ACTIONS,
  PRODUCT_LABELS,
  PRODUCT_TYPES,
  productFromInput,
  type ProductAction,
  type ProductRecord,
  type ProductType,
} from '../domain/flowDetails';
import { Button, Chip } from './components';
import { useTheme } from './theme';

export function ProductRecordForm({
  date,
  existing,
  save,
  cancel,
}: {
  date: Day;
  existing: ProductRecord | null;
  save: (record: ProductRecord) => void;
  cancel: () => void;
}) {
  const { colors, common, dark } = useTheme();
  const [id] = useState(() => existing?.id ?? randomUUID());
  const [type, setType] = useState<ProductType>(existing?.type ?? 'pad');
  const [action, setAction] = useState<ProductAction>(existing?.action ?? 'changed');
  const [quantity, setQuantity] = useState(String(existing?.quantity ?? 1));
  const [time, setTime] = useState(existing?.time ?? '');
  const [detail, setDetail] = useState(existing?.detail ?? '');
  const [amount, setAmount] = useState(existing?.collectedMl?.toString() ?? '');
  const [error, setError] = useState('');
  const submit = () => {
    try {
      const record = productFromInput({
        id,
        type,
        action,
        quantity,
        time,
        detail,
        collectedMl: canEmpty(type) && action === 'emptied' ? amount : '',
      });
      save(record);
      Keyboard.dismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this product record.');
    }
  };
  return (
    <View style={{ gap: 22 }}>
      <Button
        secondary
        label="Cancel record changes"
        icon={ArrowLeft}
        onPress={() => {
          Keyboard.dismiss();
          cancel();
        }}
      />
      <View style={{ gap: 6 }}>
        <Text style={common.heading}>
          {existing ? 'Edit product record' : 'Add product record'}
        </Text>
        <Text style={common.label}>
          {formatDay(date, { month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
        <Text style={common.body}>
          Complete the details, then {existing ? 'save your changes' : 'add the record'}. This form
          is not saved until you do.
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={common.label}>Product</Text>
        <View style={common.wrap}>
          {PRODUCT_TYPES.map((value) => (
            <Chip
              key={value}
              label={PRODUCT_LABELS[value]}
              selected={type === value}
              onPress={() => {
                setType(value);
                if (canEmpty(value) !== canEmpty(type)) {
                  setAction(canEmpty(value) ? 'emptied' : 'changed');
                  setAmount('');
                }
              }}
            />
          ))}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={common.label}>What did you log?</Text>
        <View style={common.wrap}>
          {PRODUCT_ACTIONS.filter((value) => value !== 'emptied' || canEmpty(type)).map((value) => (
            <Chip
              key={value}
              label={ACTION_LABELS[value]}
              selected={action === value}
              onPress={() => {
                setAction(value);
                if (value !== 'emptied') setAmount('');
              }}
            />
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={common.label}>Type, size, or absorbency · optional</Text>
        <TextInput
          keyboardAppearance={dark ? 'dark' : 'light'}
          selectionColor={colors.plum}
          accessibilityLabel="Product type or size"
          style={common.input}
          value={detail}
          onChangeText={setDetail}
          maxLength={60}
          placeholder="For example, regular or overnight"
          placeholderTextColor={colors.muted}
        />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={common.label}>
          {action === 'emptied' ? 'Number of emptyings' : 'Quantity'}
        </Text>
        <TextInput
          keyboardAppearance={dark ? 'dark' : 'light'}
          selectionColor={colors.plum}
          placeholderTextColor={colors.muted}
          accessibilityLabel="Product quantity"
          style={common.input}
          keyboardType="number-pad"
          value={quantity}
          onChangeText={setQuantity}
          maxLength={3}
        />
        <Text style={common.small}>
          {action === 'emptied'
            ? 'Log each emptying separately, or group several together.'
            : 'Number of products used or changed in this record.'}
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={common.label}>Time · optional</Text>
        <TextInput
          keyboardAppearance={dark ? 'dark' : 'light'}
          selectionColor={colors.plum}
          accessibilityLabel="Product time"
          style={common.input}
          value={time}
          onChangeText={setTime}
          placeholder="HH:MM, such as 08:30"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          autoCapitalize="none"
          maxLength={5}
        />
        <Text style={common.small}>
          24-hour local time on this date. Leave blank if you don’t remember.
        </Text>
      </View>
      {canEmpty(type) && action === 'emptied' && (
        <View style={{ gap: 8 }}>
          <Text style={common.label}>Collected amount · mL · optional</Text>
          <TextInput
            keyboardAppearance={dark ? 'dark' : 'light'}
            selectionColor={colors.plum}
            accessibilityLabel="Collected amount in mL"
            style={common.input}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            maxLength={7}
            placeholder="Leave blank if unknown"
            placeholderTextColor={colors.muted}
          />
          <Text style={common.small}>
            Your observed total for this record. Product counts are not converted to an amount.
          </Text>
        </View>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={common.error}>
          {error}
        </Text>
      )}
      <Button
        label={existing ? 'Save record changes' : 'Add record'}
        icon={existing ? Check : Plus}
        onPress={submit}
      />
    </View>
  );
}
