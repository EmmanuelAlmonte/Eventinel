import React from 'react';
import { View } from 'react-native';
import { Text, Input, Card, Icon, Button } from '@rneui/themed';

import { menuScreenStyles as styles } from './styles';

type QuickComposeCardProps = {
  colors: {
    surface: string;
    border: string;
    background: string;
    text: string;
    textMuted: string;
    primary: string;
  };
  noteContent: string;
  setNoteContent: (value: string) => void;
  onPublish: () => void;
  sendStatus: string;
  isError: boolean;
  statusColor: string;
};

export function QuickComposeCard({
  colors,
  noteContent,
  setNoteContent,
  onPublish,
  sendStatus,
  isError,
  statusColor,
}: QuickComposeCardProps) {
  return (
    <Card
      containerStyle={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <Icon name="edit" type="material" size={20} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Compose</Text>
      </View>

      <Input
        placeholder="What's happening?"
        value={noteContent}
        onChangeText={setNoteContent}
        multiline
        numberOfLines={3}
        containerStyle={styles.inputContainer}
        inputContainerStyle={[
          styles.input,
          { borderColor: colors.border, backgroundColor: colors.background },
        ]}
        inputStyle={[styles.inputText, { color: colors.text }]}
        placeholderTextColor={colors.textMuted}
      />

      <Button
        title="Publish Note"
        onPress={onPublish}
        containerStyle={styles.buttonContainer}
        icon={
          <Icon
            name="send"
            type="material"
            size={20}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
        }
      />

      {sendStatus ? (
        <View
          style={[
            styles.statusContainer,
            { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}40` },
          ]}
        >
          <Icon
            name={isError ? 'error-outline' : 'check-circle-outline'}
            type="material"
            size={18}
            color={statusColor}
          />
          <Text style={[styles.statusText, { color: statusColor }]}>{sendStatus}</Text>
        </View>
      ) : null}
    </Card>
  );
}
