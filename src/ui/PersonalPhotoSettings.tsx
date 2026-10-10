import React, { useEffect, useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { ImagePlus, RotateCcw } from 'lucide-react-native';
import type { PhotoControls } from '../data/personalBackgroundStore';
import { pickPersonalPhoto } from '../data/pickPersonalPhoto';
import { photoDataUri, type PreparedPhoto } from '../domain/personalImage';
import { useAppearance } from './AppearanceProvider';
import { Button } from './components';
import { useTheme } from './theme';

export function PersonalPhotoSettings({ photo }: { photo: PhotoControls }) {
  const { common, colors } = useTheme();
  const { settings, ready, demo, update, reset } = useAppearance();
  const latest = useRef(settings);
  latest.current = settings;
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const draft = useRef<PreparedPhoto | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      draft.current?.bytes.fill(0);
      draft.current = null;
    };
  }, []);
  const discard = () => {
    draft.current?.bytes.fill(0);
    draft.current = null;
    setPreview(null);
    setPreviewFailed(false);
  };
  const choose = async () => {
    if (controller.current) return;
    const operation = new AbortController();
    controller.current = operation;
    setPicking(true);
    setError('');
    try {
      const selected = await pickPersonalPhoto(operation.signal);
      if (!mounted.current || operation.signal.aborted) {
        selected?.bytes.fill(0);
        return;
      }
      if (selected) {
        discard();
        draft.current = selected;
        setPreview(photoDataUri(selected));
      }
    } catch (e) {
      if (mounted.current && !operation.signal.aborted) {
        setError(
          e instanceof Error &&
            /^(Choose |This photo |This image |Image processing |The temporary photo)/.test(
              e.message,
            )
            ? e.message
            : 'This photo could not be opened. Try a different JPEG or PNG image.',
        );
      }
    } finally {
      if (controller.current === operation) {
        controller.current = null;
        if (mounted.current) setPicking(false);
      }
    }
  };
  const apply = async () => {
    if (!draft.current) return;
    setWorking(true);
    setError('');
    try {
      if ((await photo.apply(draft.current)) && mounted.current) {
        discard();
        await update({ ...latest.current, background: 'personal' });
      }
    } catch {
      if (mounted.current) setError('This photo could not be saved. Choose it again.');
    } finally {
      if (mounted.current) setWorking(false);
    }
  };
  const remove = async (resetAll: boolean) => {
    setWorking(true);
    setError('');
    try {
      if ((await photo.remove()) && mounted.current) {
        if (resetAll) await reset();
        else if (latest.current.background === 'personal')
          await update({ ...latest.current, background: 'plain' });
      }
    } finally {
      if (mounted.current) setWorking(false);
    }
  };
  const disabled = !ready || !photo.ready || photo.busy || working || picking;
  return (
    <>
      <View style={[common.card, { gap: 14 }]}>
        <Text style={common.heading}>Your own photo</Text>
        <Text style={common.body}>
          Choose a JPEG or PNG up to 12 MB. Review it here before using it as your background. Your
          original photo stays unchanged.
        </Text>
        <Text style={common.small}>
          {demo
            ? 'Sample mode keeps your photo only for this session.'
            : 'A smaller copy is encrypted on this device and hidden while your journal is locked. It is not included in backups or reports.'}
        </Text>
        {(preview || photo.uri) && (
          <View style={{ gap: 10 }}>
            <Text style={common.label}>
              {preview ? 'Photo preview · not applied yet' : 'Your saved photo'}
            </Text>
            <Image
              key={preview ?? photo.uri}
              source={{ uri: (preview ?? photo.uri)! }}
              accessibilityLabel={preview ? 'Selected photo preview' : 'Saved personal photo'}
              resizeMode="cover"
              style={{
                width: '100%',
                height: 220,
                borderRadius: 12,
                backgroundColor: colors.background,
              }}
              onError={() => {
                if (preview) setPreviewFailed(true);
                setError('This photo preview could not load. Choose a different photo.');
              }}
            />
            <Text style={common.small}>
              The background fills the screen and may crop differently on each device. Use
              Background visibility to soften it.
            </Text>
          </View>
        )}
        {!!preview && (
          <View style={common.wrap}>
            <Button
              label="Use this photo"
              disabled={disabled || previewFailed}
              busy={working}
              onPress={() => void apply()}
            />
            <Button
              secondary
              label="Cancel photo preview"
              disabled={disabled}
              onPress={() => {
                discard();
                setError('');
              }}
            />
          </View>
        )}
        <Button
          secondary
          icon={ImagePlus}
          label={
            picking
              ? 'Preparing photo…'
              : photo.uri || preview
                ? 'Choose another photo'
                : 'Choose a photo'
          }
          disabled={disabled}
          onPress={() => void choose()}
        />
        {picking && (
          <Button
            secondary
            label="Cancel choosing photo"
            onPress={() => controller.current?.abort()}
          />
        )}
        {!!photo.uri && !preview && settings.background !== 'personal' && (
          <Button
            label="Use saved photo"
            disabled={disabled}
            onPress={() => void update({ ...settings, background: 'personal' })}
          />
        )}
        {(photo.uri || photo.error) && (
          <Button
            secondary
            label="Remove personal photo"
            disabled={disabled || !!preview}
            onPress={() => void remove(false)}
          />
        )}
        {(error || photo.error) && (
          <Text accessibilityRole="alert" style={common.error}>
            {error || photo.error}
          </Text>
        )}
        <Text style={common.small}>Removing the photo deletes only the app’s saved copy.</Text>
      </View>
      <View style={[common.card, { gap: 14 }]}>
        <Text style={common.body}>
          Appearance stays on this device and is separate from journal backups and reports. Reset
          removes the saved photo and restores Plum, System appearance, and a plain background.
        </Text>
        <Button
          secondary
          icon={RotateCcw}
          label="Reset appearance"
          disabled={disabled || !!preview}
          onPress={() => void remove(true)}
        />
      </View>
    </>
  );
}
