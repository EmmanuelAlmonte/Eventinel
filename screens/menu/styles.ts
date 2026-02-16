import { StyleSheet } from 'react-native';

export const menuScreenStyles = StyleSheet.create({
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    margin: 0,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  inputContainer: {
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 80,
  },
  inputText: {
    fontSize: 16,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    flex: 1,
  },
  grid: {
    gap: 12,
    marginBottom: 12,
  },
  menuCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    margin: 0,
  },
  menuCardWrapper: {
    padding: 0,
  },
  menuCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuCardContent: {
    flex: 1,
  },
  menuCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuCardDescription: {
    fontSize: 14,
  },
  chevronContainer: {
    padding: 8,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
