import React, { useState } from 'react';
import { SearchContextProvider } from '@backstage/plugin-search-react';
import {
  Content,
  Page,
  InfoCard,
  WarningPanel,
  CodeSnippet,
  StatusOK,
  StatusError,
  StatusPending,
} from '@backstage/core-components';
import {
  CircularProgress,
  Grid,
  makeStyles,
  Typography,
} from '@material-ui/core';

import { catalogApiRef, EntityRefLink } from '@backstage/plugin-catalog-react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useDebounce from 'react-use/lib/useDebounce';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { getClusters } from '../../clusterClient';
import { HomePageCompanyLogo } from '@backstage/plugin-home';
import Logo from '../Logo/Logo';

interface clusterEntity {
  status: boolean,
  clusterEntity: Entity
}

const useStyles = makeStyles(theme => ({
  container: {
    margin: theme.spacing(5, 0),
  },
  svg: {
    width: 'auto',
    height: 150,
  },
  typography: {
    display: 'flex',
    padding: '8px 0',
    margin: 'auto',
  },
}));

const useCatalogStyles = makeStyles({
  root: {
    height: '100%',
    transition: 'all .25s linear',
    textAlign: 'center',
    '&:hover': {
      boxShadow: '0px 0px 16px 0px rgba(0,0,0,0.8)',
    },
    '& svg': {
      fontSize: 80,
    },
    '& img': {
      height: 80,
      width: 80,
      objectFit: 'contain',
    },
  },
  subheader: {
    display: 'block',
    width: '100%',
  },
  link: {
    '&:hover': {
      textDecoration: 'none',
    },
  },
});

const CatalogClusters = () => {
  const catalogApi = useApi(catalogApiRef);
  const configApi = useApi(configApiRef);
  const classes = useCatalogStyles();

  const [clusterEntities, setClusterEntities] = useState<clusterEntity[]>([]);
  const [{ loading, error }, refresh] = useAsyncFn(
    async () => {
      const response = await catalogApi.getEntities();
      const clusters = await getClusters(configApi)

      const clusterResourceEntities = response.items.filter(
        e => (
          e.kind === 'Resource' &&
          e.spec?.type === 'cluster'
        )
      );

      setClusterEntities(clusterResourceEntities.map(entity => {
        const cluster = clusters.find(cd => (
          cd.name === entity.metadata.name
        ))
        return {
          // !! --> converts object to boolean
          status: !!cluster?.status.available!,
          clusterEntity: entity,
        }
      }));
    },
    [catalogApi],
    { loading: true },
  );
  useDebounce(refresh, 10);

  if (error) {
    return (
      <WarningPanel severity="error" title="Could not fetch catalog entities.">
        <CodeSnippet language="text" text={error.toString()} />
      </WarningPanel>
    );
  }

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <>
      {clusterEntities.map(item => (
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={item.clusterEntity.metadata.name}>
          <EntityRefLink entityRef={item.clusterEntity} className={classes.link}>
            <InfoCard
              className={classes.root}
              title={
                <div className={classes.subheader}>
                  {
                    item.status === true ? <StatusOK></StatusOK>
                      : item.status === false ? <StatusError></StatusError>
                        : <StatusPending></StatusPending>
                  }
                  {item.clusterEntity.metadata.title || item.clusterEntity.metadata.name}
                </div>
              }
            >
              <Typography paragraph>{item.clusterEntity.metadata.description}</Typography>
            </InfoCard>
          </EntityRefLink>
        </Grid>
      ))}
    </>
  );
};

export const ClusterStatusPage = () => {
  const { svg, container, typography } = useStyles();

  return (
    <SearchContextProvider>
      <Page themeId="clusters">
        <Content>
          <Grid container justifyContent="center" spacing={6}>
            <HomePageCompanyLogo
              className={container}
              logo={<Logo classes={{ svg }} />}
            />
            <Grid container item xs={12} alignItems="center" direction="row">
              <Typography
                variant='h1'
                className={typography}
              >
                Clusters
              </Typography>
            </Grid>
            <Grid container item xs={12} justifyContent="center" >
              <CatalogClusters />
            </Grid>
          </Grid>
        </Content>
      </Page>
    </SearchContextProvider>
  );
};
