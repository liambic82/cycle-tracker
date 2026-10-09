import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink } from 'lucide-react-native';
import type { Journal } from '../domain/journal';
import { formatDay, type Day } from '../domain/dates';
import {
  dayContext,
  educationCards,
  EDUCATION_CHECKED_ON,
  EDUCATION_SOURCES,
} from '../domain/cycleContext';
import { Button, Chip } from './components';
import { useTheme } from './theme';

export function CycleContext({
  journal,
  date,
  today,
  done,
  doneLabel,
}: {
  journal: Journal;
  date: Day;
  today: Day;
  done: () => void;
  doneLabel: string;
}) {
  const { colors, common } = useTheme();
  const context = dayContext(journal, date, today);
  const cards = educationCards(journal.preferences.showPerimenopause);
  const [topic, setTopic] = useState('cycle');
  const [sourceError, setSourceError] = useState('');
  const index = Math.max(
    0,
    cards.findIndex((card) => card.id === topic),
  );
  const card = cards[index]!;
  const choose = (id: string) => {
    setTopic(id);
    setSourceError('');
  };
  const openSource = async (url: string) => {
    setSourceError('');
    try {
      await Linking.openURL(url);
    } catch {
      setSourceError(
        'The source could not be opened. The cards still work offline; try the link when connected.',
      );
    }
  };
  return (
    <View style={{ width: '100%', maxWidth: 850, alignSelf: 'center', gap: 20 }}>
      <Button secondary icon={ArrowLeft} label={doneLabel} onPress={done} />
      <View style={[common.readable, { gap: 8 }]}>
        <Text accessibilityRole="header" style={common.heading}>
          Your day in context.
        </Text>
        <Text style={common.body}>
          {formatDay(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
      </View>
      <View style={[common.card, { backgroundColor: colors.sage, gap: 12 }]}>
        <Text style={[common.eyebrow, { color: colors.sageInk }]}>IN YOUR JOURNAL</Text>
        <Text style={common.heading}>
          {context.future
            ? 'A day still to come'
            : context.cycleDay === null
              ? 'No earlier period start logged'
              : `Recorded cycle day ${context.cycleDay}`}
        </Text>
        <Text style={common.body}>
          {context.future
            ? 'No cycle day or flow is projected for this date. You can still explore the general information below.'
            : context.lastStart
              ? `${context.daysSinceStart} ${context.daysSinceStart === 1 ? 'day' : 'days'} since the period start you logged on ${formatDay(context.lastStart, { month: 'short', day: 'numeric', year: 'numeric' })}. This count follows recorded starts; missing entries can leave gaps.`
              : 'A period-start marker on or before this date is needed to count a recorded cycle day. Other logs do not create that marker.'}
        </Text>
        {!context.future && (
          <Text style={common.label}>
            {context.flow === 'unknown'
              ? 'Flow: not logged for this day'
              : context.flow === 'none'
                ? 'Flow: explicitly recorded as none'
                : `Flow: ${context.flow}, as recorded`}
          </Text>
        )}
        <View style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 12, gap: 6 }}>
          <Text style={common.label}>Phase: not determined</Text>
          <Text style={common.body}>
            A cycle-day count does not measure hormone levels or confirm ovulation. These records do
            not establish a personal phase.
          </Text>
        </View>
      </View>
      <View style={[common.readable, { gap: 12 }]}>
        <View style={common.row}>
          <BookOpen size={20} color={colors.plum} />
          <Text accessibilityRole="header" style={[common.heading, { flex: 1 }]}>
            Explore, at your pace.
          </Text>
        </View>
        <Text style={common.body}>
          General education, not a forecast for{' '}
          {formatDay(date, { month: 'short', day: 'numeric' })}. Topics are yours to choose; they
          are not assigned from your symptoms or medications.
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
        >
          {cards.map((item) => (
            <Chip
              key={item.id}
              label={item.topic}
              accessibilityLabel={`Learn about ${item.topic}`}
              selected={card.id === item.id}
              onPress={() => choose(item.id)}
            />
          ))}
        </ScrollView>
      </View>
      <View style={[common.card, { gap: 16 }]}>
        <Text accessibilityLiveRegion="polite" style={common.eyebrow}>
          TOPIC {index + 1} OF {cards.length} · {card.topic.toUpperCase()}
        </Text>
        <Text accessibilityRole="header" style={common.heading}>
          {card.title}
        </Text>
        <Text style={[common.body, { color: colors.ink }]}>{card.body}</Text>
        <View style={{ borderLeftWidth: 3, borderLeftColor: colors.rose, paddingLeft: 14 }}>
          <Text style={common.body}>{card.prompt}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Button
            secondary
            icon={ArrowLeft}
            label="Previous topic"
            disabled={index === 0}
            onPress={() => choose(cards[index - 1]!.id)}
            style={{ flexGrow: 1 }}
          />
          <Button
            secondary
            icon={ArrowRight}
            label="Next topic"
            disabled={index === cards.length - 1}
            onPress={() => choose(cards[index + 1]!.id)}
            style={{ flexGrow: 1 }}
          />
        </View>
        <View style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 14, gap: 8 }}>
          <Text style={common.label}>Read the sources</Text>
          {card.sources.map((id) => {
            const source = EDUCATION_SOURCES[id];
            return (
              <Pressable
                key={id}
                accessibilityRole="link"
                accessibilityLabel={`${source.publisher}: ${source.title}. Opens external website.`}
                onPress={() => void openSource(source.url)}
                style={{ minHeight: 48, flexDirection: 'row', gap: 8, alignItems: 'center' }}
              >
                <ExternalLink size={16} color={colors.plumDark} />
                <Text
                  style={[
                    common.small,
                    { flex: 1, color: colors.plumDark, textDecorationLine: 'underline' },
                  ]}
                >
                  {source.publisher} · {source.title}
                </Text>
              </Pressable>
            );
          })}
          <Text style={common.small}>
            Cards are available offline. Source links open a website and need a connection; no
            journal details are included in the link. Sources checked {EDUCATION_CHECKED_ON}.
          </Text>
          {!!sourceError && (
            <Text accessibilityRole="alert" style={common.error}>
              {sourceError}
            </Text>
          )}
        </View>
      </View>
      <Text style={[common.small, common.readable]}>
        Hormonal treatments and life changes can alter cycle patterns. These cards offer general
        information, not a diagnosis or treatment plan. They must not be used to choose fertile or
        “safe” days.
      </Text>
      <Button secondary label={doneLabel} onPress={done} />
    </View>
  );
}
