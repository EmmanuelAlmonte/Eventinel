import { StyleSheet } from 'react-native';

export const walletScreenStyles = StyleSheet.create({
  header: {
    marginBottom: 12,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  card: {
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  meta: {
    fontSize: 13,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputContainer: {
    paddingHorizontal: 0,
  },
  input: {
    borderBottomWidth: 0,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  buttonContainer: {
    marginTop: 6,
  },
  rowActions: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  invoiceBox: {
    marginTop: 10,
    borderRadius: 10,
  },
  invoiceLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  invoiceValue: {
    fontSize: 12,
    lineHeight: 16,
  },
  invoiceActions: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  smallActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  kvLabel: {
    width: 70,
    fontSize: 12,
  },
  kvValue: {
    flex: 1,
    fontSize: 12,
  },
});
