import React from 'react';
import renderer from 'react-test-renderer';
import { fireEvent } from '@testing-library/react';
import { themed, router, renderWithWrapper } from 'utils/tests';
import SVGIcon from '@material-ui/core/SvgIcon';
import { NavRoute } from 'core/routes/types';
import Entry, { AccordionEntry } from './Entry';

describe('core/layout/SideNavEntry', () => {
  it('renders correctly with link', () => {
    const tree = renderer
      .create(router(themed(<Entry Icon={SVGIcon} name="Test" path="/test" />)))
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders correctly without link', () => {
    const tree = renderer.create(router(themed(<Entry Icon={SVGIcon} name="Test" />))).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('hides the label when sidebarOpen is false', () => {
    const { queryByText } = renderWithWrapper(
      <Entry Icon={SVGIcon} name="Test" path="/test" sidebarOpen={false} />,
    );
    expect(queryByText('Test')).not.toBeInTheDocument();
  });
});

describe('core/layout/SideNav AccordionEntry', () => {
  const groupChildren: NavRoute[] = [
    { path: '/group/a', name: 'Child A', Icon: SVGIcon },
    { path: '/group/b', name: 'Child B', Icon: SVGIcon },
  ];

  it('renders group and child labels when the sidebar is open (default)', () => {
    const { getByText } = renderWithWrapper(
      <AccordionEntry
        name="Group"
        Icon={SVGIcon}
        children={groupChildren}
        expanded
        onToggle={jest.fn()}
      />,
    );
    expect(getByText('Group')).toBeInTheDocument();
    expect(getByText('Child A')).toBeInTheDocument();
    expect(getByText('Child B')).toBeInTheDocument();
  });

  it('renders only the icon-only group entry (no children) when collapsed and not the open group', () => {
    const { queryByText, container } = renderWithWrapper(
      <AccordionEntry
        name="Group"
        Icon={SVGIcon}
        children={groupChildren}
        expanded={false}
        onToggle={jest.fn()}
        sidebarOpen={false}
      />,
    );

    expect(queryByText('Group')).not.toBeInTheDocument();
    expect(queryByText('Child A')).not.toBeInTheDocument();
    expect(queryByText('Child B')).not.toBeInTheDocument();

    // only the group link (to its first child) — no child sub-nav entries
    expect(container.querySelectorAll('a[href]')).toHaveLength(1);
    expect(container.querySelectorAll('a[href="/group/a"]')).toHaveLength(1);
  });

  it('also renders icon-only child entries when collapsed and this group is the open one', () => {
    const { queryByText, container } = renderWithWrapper(
      <AccordionEntry
        name="Group"
        Icon={SVGIcon}
        children={groupChildren}
        expanded
        onToggle={jest.fn()}
        sidebarOpen={false}
      />,
    );

    expect(queryByText('Group')).not.toBeInTheDocument();
    expect(queryByText('Child A')).not.toBeInTheDocument();
    expect(queryByText('Child B')).not.toBeInTheDocument();

    // group link (to first child) + one link per child, all icon-only
    expect(container.querySelectorAll('a[href]')).toHaveLength(3);
    expect(container.querySelectorAll('a[href="/group/a"]')).toHaveLength(2);
    expect(container.querySelectorAll('a[href="/group/b"]')).toHaveLength(1);
  });

  it('marks the group as open when its collapsed icon is clicked', () => {
    const onToggle = jest.fn();
    const { container } = renderWithWrapper(
      <AccordionEntry
        name="Group"
        Icon={SVGIcon}
        children={groupChildren}
        expanded={false}
        onToggle={onToggle}
        sidebarOpen={false}
      />,
    );

    // click the inner ListItem, not the anchor itself — a click on the outer <a>
    // doesn't bubble down into the nested onClick handler.
    const groupListItem = container.querySelector('a[href="/group/a"] li') as HTMLElement;
    fireEvent.click(groupListItem);

    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
