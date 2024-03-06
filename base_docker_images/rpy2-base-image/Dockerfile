# Heavily inspired by rpy2-base-ubuntu, except built on top of r-base:4.3.2
ARG R_VERSION=4.3.2

FROM r-base:${R_VERSION}

ARG RPY2_VERSION=3.5.15
ARG PYTHON_VERSION=3.11

ENV CRAN_MIRROR=https://cloud.r-project.org \
    CRAN_MIRROR_TAG=-cran40

ARG DEBIAN_FRONTEND=noninteractive
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN echo "broom\n\
      DBI\n\
      dbplyr\n\
      dplyr\n\
      hexbin\n\
      ggplot2\n\
      lazyeval\n\
      lme4\n\
      RSQLite\n\
      tidyr\n\
      viridis" > rpacks.txt && \
    R -e 'install.packages(sub("(.+)\\\\n","\\1", scan("rpacks.txt", "character")), repos="'"${CRAN_MIRROR}"'")' && \
    rm rpacks.txt && \
    rm -rf /tmp/downloaded_packages/ /tmp/*.rds && \
    apt-get update && apt-get install -y python${PYTHON_VERSION} python${PYTHON_VERSION}-dev python${PYTHON_VERSION}-venv && \ 
    python3 -m venv /opt/python3_env 

ENV PATH=/opt/python3_env/bin:$PATH

RUN python3 -m pip --no-cache-dir install pip --upgrade && \
    python3 -m pip --no-cache-dir install setuptools --upgrade && \
    python3 -m pip --no-cache-dir install wheel --upgrade && \
    python3 -m pip install \
	    jinja2 \
	    numpy \
	    pandas \
	    pytest \
	    sphinx \
	    tzlocal \
        rpy2==${RPY2_VERSION} && \
    rm -rf /root/.cache \
    && rm -rf /tmp/* \
    && apt-get remove --purge -y $BUILDDEPS \
    && apt-get autoremove -y \
    && apt-get autoclean -y 


