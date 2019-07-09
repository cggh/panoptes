# Use an official Python runtime as a parent image
FROM python:3.7-stretch

# Set the working directory to /app
WORKDIR /panoptes

# Copy the current directory contents into the container
COPY . /panoptes

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install apt-transport-https && \
    echo "deb http://dev.monetdb.org/downloads/deb/ stretch monetdb" >> /etc/apt/sources.list.d/monetdb.list && \
    echo "deb-src http://dev.monetdb.org/downloads/deb/ stretch monetdb" >> /etc/apt/sources.list.d/monetdb.list && \
    wget --output-document=- https://www.monetdb.org/downloads/MonetDB-GPG-KEY | apt-key add - && \
    apt-get update -y && \
    curl -sL https://deb.nodesource.com/setup_10.x | bash - && \
    apt-get install -y monetdb5-sql monetdb-client virtualenv nodejs npm && \
    rm -rf /var/lib/apt/lists/*
RUN cp /panoptes/config.py.example /panoptes/config.py && \
    /panoptes/scripts/build.sh && \
    npm install -g npm && \
    npm install -g n && \
    n stable && \
    npm install -g yarn && \
    cd /panoptes/webapp  && yarn && npm run build

# Make port 80 available to the world outside this container
EXPOSE 8000

# Define environment variable
#ENV NAME World

# Run app.py when the container launches
CMD ["/panoptes/scripts/run.sh", "0.0.0.0:8000"]


