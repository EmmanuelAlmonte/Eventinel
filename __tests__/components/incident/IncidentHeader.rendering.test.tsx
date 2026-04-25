/**
 * IncidentHeader rendering, title, styling, updates, and edge cases.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import {
  IncidentHeader,
  createDefaultProps,
  getStyleProp,
  renderIncidentHeader,
  resetIncidentHeaderMocks,
} from './incidentHeaderTestHarness';

describe('IncidentHeader rendering and updates', () => {
  beforeEach(resetIncidentHeaderMocks);

  it('renders without crashing', () => {
    const { getByText } = renderIncidentHeader();
    expect(getByText('Test Incident Title')).toBeTruthy();
  });

  it('renders a container View', () => {
    const { toJSON } = renderIncidentHeader();
    const tree = toJSON();

    expect(tree).not.toBeNull();
    expect(tree?.type).toBe('View');
  });

  it('renders title text', () => {
    const { getByText } = renderIncidentHeader({ title: 'Major Fire Downtown' });
    expect(getByText('Major Fire Downtown')).toBeTruthy();
  });

  it('handles long titles with numberOfLines limit', () => {
    const title =
      'This is a very long incident title that should be truncated after two lines to prevent layout issues';
    const { getByText } = renderIncidentHeader({ title });

    expect(getByText(title).props.numberOfLines).toBe(2);
  });

  it('handles empty title', () => {
    const { toJSON } = renderIncidentHeader({ title: '' });
    expect(toJSON()).not.toBeNull();
  });

  it('handles special characters in title', () => {
    const title = 'Fire at 123 Main St. & Oak Ave.';
    const { getByText } = renderIncidentHeader({ title });

    expect(getByText(title)).toBeTruthy();
  });

  it('handles unicode-safe title text', () => {
    const title = 'Emergency at location';
    const { getByText } = renderIncidentHeader({ title });

    expect(getByText(title)).toBeTruthy();
  });

  it('uses flexDirection row for main container', () => {
    const { toJSON } = renderIncidentHeader();

    expect(toJSON()?.props.style).toEqual(
      expect.objectContaining({ flexDirection: 'row' })
    );
  });

  it('title has bold font weight', () => {
    const { getByText } = renderIncidentHeader();
    const title = getByText('Test Incident Title');

    expect(getStyleProp(title.props.style, 'fontWeight')).toBe('700');
  });

  it('updates when type changes', () => {
    const { getByText, rerender, queryByText } = renderIncidentHeader({
      type: 'fire',
    });

    expect(getByText('FIRE')).toBeTruthy();

    rerender(<IncidentHeader {...createDefaultProps({ type: 'medical' })} />);

    expect(queryByText('FIRE')).toBeNull();
    expect(getByText('MEDICAL')).toBeTruthy();
  });

  it('updates when severity changes', () => {
    const { getByText, rerender, queryByText } = renderIncidentHeader({
      severity: 2,
    });

    expect(getByText('Severity 2')).toBeTruthy();

    rerender(<IncidentHeader {...createDefaultProps({ severity: 5 })} />);

    expect(queryByText('Severity 2')).toBeNull();
    expect(getByText('Severity 5')).toBeTruthy();
  });

  it('updates when title changes', () => {
    const { getByText, rerender, queryByText } = renderIncidentHeader({
      title: 'Original Title',
    });

    expect(getByText('Original Title')).toBeTruthy();

    rerender(<IncidentHeader {...createDefaultProps({ title: 'New Title' })} />);

    expect(queryByText('Original Title')).toBeNull();
    expect(getByText('New Title')).toBeTruthy();
  });

  it('updates verified badge when verified prop changes', () => {
    const { getByText, rerender, queryByText } = renderIncidentHeader({
      verified: true,
    });

    expect(getByText('Verified')).toBeTruthy();

    rerender(<IncidentHeader {...createDefaultProps({ verified: false })} />);

    expect(queryByText('Verified')).toBeNull();
  });

  it('renders consistently across multiple renders', () => {
    const props = createDefaultProps();
    const { toJSON: toJSON1 } = render(<IncidentHeader {...props} />);
    const { toJSON: toJSON2 } = render(<IncidentHeader {...props} />);

    expect(JSON.stringify(toJSON1()?.type)).toEqual(
      JSON.stringify(toJSON2()?.type)
    );
  });
});
