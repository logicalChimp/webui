import { useMemo } from 'react';
import { useContainer } from 'unstated-next';
import { PluginContainer } from 'core/plugins/hooks';
import { Route, NavRoute } from './types';

export const useGetRoutes = () => {
  const { pluginMap } = useContainer(PluginContainer);
  const routes: Route[] = useMemo(
    () =>
      Object.entries(pluginMap).flatMap(([path, { component, displayName, icon, hidden }]) =>
        component
          ? [
              {
                path,
                component,
                Icon: icon,
                name: displayName,
                hidden,
              },
            ]
          : [],
      ),
    [pluginMap],
  );
  return { routes };
};

export const useGetNavRoutes = () => {
  const { pluginMap } = useContainer(PluginContainer);

  const navRoutes = useMemo((): NavRoute[] => {
    const entries = Object.entries(pluginMap);

    // Build group header stubs keyed by path
    const groups = new Map<string, NavRoute & { children: NavRoute[] }>();
    entries.forEach(([path, plugin]) => {
      if (!plugin.component && !plugin.group) {
        groups.set(path, { path, name: plugin.displayName, Icon: plugin.icon, children: [] });
      }
    });

    // Slot non-hidden child plugins into their groups
    entries.forEach(([path, plugin]) => {
      if (plugin.component && plugin.group && !plugin.hidden) {
        const group = groups.get(plugin.group);
        if (group) {
          group.children.push({
            path,
            component: plugin.component,
            name: plugin.displayName,
            Icon: plugin.icon,
          });
        }
      }
    });

    // Build ordered result, inserting groups where registered and skipping grouped children.
    // Groups with no visible children are omitted.
    const result: NavRoute[] = [];
    entries.forEach(([path, plugin]) => {
      if (plugin.group) return;
      if (!plugin.component) {
        const group = groups.get(path);
        if (group?.children.length) result.push(group);
      } else if (!plugin.hidden) {
        result.push({ path, component: plugin.component, name: plugin.displayName, Icon: plugin.icon });
      }
    });

    return result;
  }, [pluginMap]);

  return { navRoutes };
};
