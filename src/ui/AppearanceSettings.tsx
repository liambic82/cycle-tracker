import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { BackgroundVisibility } from './BackgroundVisibility';
import { ArrowLeft, Check, Palette } from 'lucide-react-native';
import type { PhotoControls } from '../data/personalBackgroundStore';
import { PersonalPhotoSettings } from './PersonalPhotoSettings';
import {
  BACKGROUNDS,
  PALETTES,
  type AppearanceSettings as Preferences,
  type PaletteId,
} from '../domain/appearance';
import { useAppearance } from './AppearanceProvider';
import { backgroundAssets } from './backgroundAssets';
import { Button, Chip } from './components';
import { useTheme } from './theme';

export function AppearanceSettings({ close, photo }: { close: () => void; photo: PhotoControls }) {
  const { colors, common } = useTheme();
  const { settings, ready, saving, error, demo, update, retry } = useAppearance();
  const activeArt = BACKGROUNDS.find((art) => art.id === settings.background);
  const [collection, setCollection] = useState<PaletteId>(
    activeArt?.palette ??
      (BACKGROUNDS.some((art) => art.palette === settings.palette)
        ? settings.palette
        : 'buttercup-morning'),
  );
  const [imageError, setImageError] = useState('');
  const choose = (patch: Partial<Preferences>) => {
    if (ready) void update({ ...settings, ...patch });
  };
  const collections = PALETTES.filter((p) => BACKGROUNDS.some((art) => art.palette === p.id));
  const artChoices = BACKGROUNDS.filter((art) => art.palette === collection);
  return (
    <View style={{ gap: 22 }}>
      <Button secondary icon={ArrowLeft} label="Back to your data" onPress={close} />
      <View style={[common.card, { gap: 10 }]}>
        <Palette size={26} color={colors.plum} />
        <Text style={common.heading}>Make it feel like you.</Text>
        <Text style={common.body}>
          Choose your colors and a little scenery. Text and records stay on solid surfaces.
        </Text>
        <Text accessibilityLiveRegion="polite" style={common.small}>
          {!ready
            ? 'Loading appearance…'
            : demo
              ? 'Sample mode · appearance changes last for this session only.'
              : saving
                ? 'Saving appearance…'
                : error
                  ? 'Appearance needs attention below.'
                  : 'Appearance saved on this device.'}
        </Text>
        {!!error && (
          <>
            <Text accessibilityRole="alert" style={common.error}>
              {error}
            </Text>
            <Button secondary label="Retry saving appearance" onPress={() => void retry()} />
          </>
        )}
      </View>
      <View style={[common.card, { gap: 16 }]}>
        <Text style={common.heading}>Color palette</Text>
        <View style={[common.wrap, { gap: 10 }]}>
          {PALETTES.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${p.name} palette`}
              accessibilityState={{ selected: settings.palette === p.id, disabled: !ready }}
              aria-pressed={settings.palette === p.id}
              disabled={!ready}
              onPress={() => {
                choose({ palette: p.id });
                if (BACKGROUNDS.some((art) => art.palette === p.id)) setCollection(p.id);
              }}
              style={({ pressed }) => ({
                flexBasis: 170,
                flexGrow: 1,
                minHeight: 58,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: settings.palette === p.id ? colors.plum : colors.line,
                backgroundColor: settings.palette === p.id ? colors.accentSoft : colors.paper,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: p.swatch,
                  borderWidth: 1,
                  borderColor: colors.muted,
                }}
              />
              <Text style={[common.label, { flex: 1 }]}>{p.name}</Text>
              {settings.palette === p.id && <Check size={18} color={colors.plum} />}
            </Pressable>
          ))}
        </View>
        <Text style={common.small}>
          Calendar flow colors keep their meaning across every palette.
        </Text>
        <Text style={common.label}>Appearance</Text>
        <View style={common.wrap}>
          {(['system', 'light', 'dark'] as const).map((mode) => (
            <Chip
              key={mode}
              label={mode[0]!.toUpperCase() + mode.slice(1)}
              selected={settings.mode === mode}
              disabled={!ready}
              onPress={() => choose({ mode })}
            />
          ))}
        </View>
      </View>
      <View style={[common.card, { gap: 16 }]}>
        <Text style={common.heading}>Background</Text>
        <View style={common.wrap}>
          <Chip
            label="Plain"
            selected={settings.background === 'plain'}
            disabled={!ready}
            onPress={() => choose({ background: 'plain' })}
          />
          <Chip
            label="Soft wash"
            selected={settings.background === 'wash'}
            disabled={!ready}
            onPress={() => choose({ background: 'wash' })}
          />
          <Chip
            label="Built-in artwork"
            selected={!!activeArt}
            disabled={!ready}
            onPress={() => choose({ background: artChoices[0]!.id })}
          />
          <Chip
            label="Personal image"
            selected={settings.background === 'personal'}
            disabled={!ready}
            onPress={() => choose({ background: 'personal' })}
          />
        </View>
        <Text style={common.small}>
          {activeArt
            ? `Selected: ${activeArt.name} · ${PALETTES.find((p) => p.id === activeArt.palette)!.name}`
            : settings.background === 'personal'
              ? photo.uri
                ? 'Your own photo · stored only on this device.'
                : 'Choose your own photo below. Until then, your background stays plain.'
              : settings.background === 'wash'
                ? 'A gentle wash of your selected palette.'
                : 'A simple background in your selected palette.'}
        </Text>
        {settings.background !== 'plain' && (
          <View style={{ gap: 6 }}>
            <Text style={common.label}>Background visibility · {settings.visibility}%</Text>
            <BackgroundVisibility
              value={settings.visibility}
              disabled={!ready}
              onChange={(visibility) => choose({ visibility })}
            />
            <Text style={common.small}>
              0% hides the artwork. 60% is strongest. Cards remain opaque.
            </Text>
          </View>
        )}
        <Text style={common.label}>Browse the built-in collection</Text>
        <View style={common.wrap}>
          {collections.map((p) => (
            <Chip
              key={p.id}
              label={p.name}
              accessibilityLabel={`Browse ${p.name} backgrounds`}
              selected={collection === p.id}
              onPress={() => {
                setCollection(p.id);
                setImageError('');
              }}
            />
          ))}
        </View>
        <View style={[common.wrap, { gap: 14 }]}>
          {artChoices.map((art) => (
            <Pressable
              key={art.id}
              accessibilityRole="button"
              accessibilityLabel={`Use ${art.name} background`}
              accessibilityState={{ selected: settings.background === art.id, disabled: !ready }}
              aria-pressed={settings.background === art.id}
              disabled={!ready}
              onPress={() => choose({ background: art.id })}
              style={({ pressed }) => ({
                flexBasis: 190,
                flexGrow: 1,
                borderWidth: 2,
                borderRadius: 14,
                borderColor: settings.background === art.id ? colors.plum : colors.line,
                overflow: 'hidden',
                backgroundColor: colors.paper,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Image
                source={backgroundAssets[art.id]}
                resizeMode="cover"
                accessible={false}
                style={{ width: '100%', height: 150 }}
                onError={() =>
                  setImageError(
                    'An artwork preview could not load. You can still use Plain or Soft wash.',
                  )
                }
              />
              <View style={[common.between, { padding: 13 }]}>
                <Text style={[common.label, { flex: 1 }]}>{art.name}</Text>
                {settings.background === art.id && <Check color={colors.plum} size={18} />}
              </View>
            </Pressable>
          ))}
        </View>
        {!!imageError && (
          <Text accessibilityRole="alert" style={common.error}>
            {imageError}
          </Text>
        )}
        <Text style={common.small}>
          All 12 backgrounds are included and work offline in the installed app. You can pair any
          image with any palette.
        </Text>
      </View>
      <PersonalPhotoSettings photo={photo} />
    </View>
  );
}
